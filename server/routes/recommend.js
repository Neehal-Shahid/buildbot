const express = require("express");
const crypto = require("crypto");
const {
  productDB,
  storeDB,
  analyticsDB,
  configDB,
  orderRequestDB,
} = require("../database");
const { normalizeCategory } = require("../lib/categories");
const { JWT_SECRET } = require("../lib/secrets");

const router = express.Router();

// Order-view links (sent in the WhatsApp message) need to be guessable-proof
// without adding a database column — order_requests.id is a small sequential
// autoincrement, so a bare /order/:id link would let anyone page through
// every store's orders. Signing the id with the server's own secret makes
// the link unforgeable without needing per-order storage.
function signOrderId(id) {
  return crypto.createHmac("sha256", JWT_SECRET).update(String(id)).digest("hex").slice(0, 16);
}

// ─── Build engine ───────────────────────────────────────────────
// Everything below is deterministic (no AI call, no arithmetic risk):
// it reads the store's own catalog, infers compatibility from the
// name/description text (socket, RAM generation, wattage, form factor),
// and assembles three budget-safe, compatibility-checked builds.

const REQUIRED_CATEGORIES = [
  "CPU",
  "Motherboard",
  "RAM",
  "Storage",
  "PSU",
  "Case",
];
const REQUIRED_SET = new Set(REQUIRED_CATEGORIES);

// ─── Spec inference from free text (name + description) ──────────
// Store owners only give us name/category/price/description, so we
// pull out compatibility hints (socket, RAM generation, wattage, form
// factor) with regexes. Whenever a spec can't be detected on either
// side of a comparison, we treat it as "unknown" and allow the pair
// (best effort) rather than blocking a build over missing metadata.

function specText(product) {
  return `${product?.name || ""} ${product?.description || ""}`;
}

function detectSocket(product) {
  const text = specText(product);
  const lga = text.match(/\bLGA\s?-?\s?(\d{3,4})\b/i);
  if (lga) return `LGA${lga[1]}`;
  const amd = text.match(
    /\b(AM[45]|AM3\+?|AM2\+?|FM2\+?|TR4|sTRX4|sWRX8|sTR5)\b/i,
  );
  if (amd) return amd[1].toUpperCase();
  return null;
}

// Coolers often support several sockets — collect all mentioned ones.
function detectSocketSet(product) {
  const text = specText(product);
  const set = new Set();
  (text.match(/\bLGA\s?-?\s?\d{3,4}\b/gi) || []).forEach((s) =>
    set.add(s.replace(/\s|-/g, "").toUpperCase()),
  );
  (
    text.match(/\b(AM[45]|AM3\+?|AM2\+?|FM2\+?|TR4|sTRX4|sWRX8|sTR5)\b/gi) ||
    []
  ).forEach((s) => set.add(s.toUpperCase()));
  return set;
}

function detectRamType(product) {
  const m = specText(product).match(/\bDDR([345])\b/i);
  return m ? `DDR${m[1]}` : null;
}

function detectFormFactor(product) {
  const text = specText(product).toLowerCase();
  if (/\bmini[\s-]?itx\b|\bitx\b/.test(text)) return "ITX";
  if (/\bmicro[\s-]?atx\b|\bm-?atx\b|\bmatx\b/.test(text)) return "MicroATX";
  if (/\batx\b/.test(text)) return "ATX";
  return null;
}

function detectWattage(product) {
  const m = specText(product).match(/(\d{2,4})\s?w(?:att)?s?\b/i);
  return m ? Number(m[1]) : null;
}

function socketsMatch(a, b) {
  if (!a || !b) return true;
  return a.replace(/\s|-/g, "").toUpperCase() === b.replace(/\s|-/g, "").toUpperCase();
}

function coolerFitsCpu(coolerSocketSet, cpuSocket) {
  if (!cpuSocket || !coolerSocketSet || coolerSocketSet.size === 0)
    return true;
  return coolerSocketSet.has(cpuSocket.toUpperCase());
}

function ramTypeMatches(ramType, boardType) {
  if (!ramType || !boardType) return true;
  return ramType === boardType;
}

function caseFitsBoard(caseFF, boardFF) {
  if (!caseFF || !boardFF) return true;
  const order = { ITX: 0, MicroATX: 1, ATX: 2 };
  return order[caseFF] >= order[boardFF];
}

function estimateGpuWattage(gpu) {
  const explicit = detectWattage(gpu);
  if (explicit) return explicit;
  const price = Number(gpu.price) || 0;
  if (price <= 20000) return 120;
  if (price <= 40000) return 150;
  if (price <= 60000) return 200;
  if (price <= 90000) return 250;
  if (price <= 130000) return 320;
  return 450;
}

// Same idea as estimateGpuWattage's price ladder — a CPU listing that
// doesn't literally state a wattage number used to fall back to a flat
// 65W regardless of price, which badly undersized the PSU requirement for
// any high-draw CPU (e.g. a 200W+ part) whose store listing just never
// mentions TDP. Bands are deliberately on the higher side within each
// price tier: this number feeds a safety-relevant PSU-sufficiency check,
// so overestimating a bit is far safer than underestimating.
function estimateCpuWattage(cpu) {
  const explicit = detectWattage(cpu);
  if (explicit) return explicit;
  const price = Number(cpu.price) || 0;
  if (price <= 15000) return 65;
  if (price <= 35000) return 75;
  if (price <= 55000) return 95;
  if (price <= 80000) return 125;
  if (price <= 120000) return 150;
  return 200;
}

function requiredPsuWattage(cpu, gpu) {
  const cpuW = estimateCpuWattage(cpu);
  const gpuW = gpu ? estimateGpuWattage(gpu) : 0;
  const baseline = 120; // motherboard, drives, fans headroom
  return Math.ceil((baseline + cpuW + gpuW) * 1.2);
}

function psuSufficient(psu, cpu, gpu) {
  const psuW = detectWattage(psu);
  if (!psuW) return true; // no wattage info — don't block, best effort
  return psuW >= requiredPsuWattage(cpu, gpu);
}

// Whether a CPU can drive a display on its own (no discrete GPU needed).
// Used only when a GPU had to be dropped from a build to fit budget, so we
// can warn the customer if the picked CPU truly needs a graphics card to
// output any video at all. "unknown" means the name/description gave no
// clear signal either way — we still allow the build, but flag it.
function integratedGraphicsStatus(cpu) {
  const text = specText(cpu).toLowerCase();
  if (
    text.includes("integrated graphics") ||
    text.includes("igpu") ||
    text.includes("uhd graphics") ||
    text.includes("iris xe") ||
    text.includes("iris x") ||
    text.includes("radeon graphics") ||
    text.includes("vega graphics") ||
    /\b\d{3,5}ge?\b/i.test(text) // AMD Ryzen "G"/"GE" APU suffix, e.g. 5600G
  )
    return "present";
  if (
    text.includes("no integrated graphics") ||
    text.includes("without integrated graphics") ||
    text.includes("no igpu") ||
    /\b\d{3,5}k?f\b/i.test(text) // Intel "F"/"KF" suffix, e.g. 13400F, 13900KF
  )
    return "none";
  return "unknown";
}

// Whether the CPU itself already ships with a usable stock cooler, judged
// only from that CPU's own listing text — most boxed, non-overclocking CPUs
// include one, and store owners who bundle a cooler tend to say so. Absence
// of a signal defaults to "needs a cooler" (today's behavior), since that's
// the safer assumption for high-TDP/unlocked chips that never include one.
function cpuHasBundledCooler(cpu) {
  const text = specText(cpu).toLowerCase();
  return (
    text.includes("stock cooler") ||
    text.includes("cooler included") ||
    text.includes("bundled cooler") ||
    text.includes("includes cooler") ||
    text.includes("comes with cooler") ||
    text.includes("boxed with cooler") ||
    text.includes("with stock fan")
  );
}

// Whether the case already comes with enough fans for decent airflow,
// judged only from that case's own listing text. Absence of a signal
// defaults to "needs fans" (today's behavior) — most bare case listings
// only guarantee a single stock fan, not enough for real airflow.
function caseIncludesFans(caseItem) {
  const text = specText(caseItem).toLowerCase();
  if (
    text.includes("no fans") ||
    text.includes("fan not included") ||
    text.includes("fans not included")
  )
    return false;
  return (
    text.includes("fans included") ||
    text.includes("fan included") ||
    text.includes("pre-installed fan") ||
    text.includes("pre installed fan") ||
    text.includes("preinstalled fan") ||
    /\b[2-9]\s*x?\s*fans?\b/i.test(text) // "3 fans", "2x fans" etc — one fan alone isn't enough airflow
  );
}

// ─── Candidate pools ───────────────────────────────────────────────

function buildCatalogByCategory(products) {
  const map = new Map();
  (products || []).forEach((p) => {
    const category = normalizeCategory(p.category, p.name);
    const price = Number(p.price);
    if (!category || !Number.isFinite(price) || price <= 0) return;
    if (!map.has(category)) map.set(category, []);
    map.get(category).push({ ...p, category, price });
  });
  map.forEach((list) => list.sort((a, b) => a.price - b.price));
  return map;
}

function compatiblePairs(cpus, boards) {
  const pairs = [];
  cpus.forEach((cpu) => {
    const cpuSocket = detectSocket(cpu);
    boards.forEach((board) => {
      const boardSocket = detectSocket(board);
      if (socketsMatch(cpuSocket, boardSocket)) {
        pairs.push({
          cpu,
          board,
          cost: cpu.price + board.price,
          cpuSocket,
          boardSocket,
        });
      }
    });
  });
  pairs.sort((a, b) => a.cost - b.cost);
  return pairs;
}

// Bound the search space on huge catalogs — the true optimum for both
// the cheapest and the priciest achievable build is essentially always
// among the cheapest/priciest anchor pairs by raw cost.
function evaluablePairs(pairs, limitEachEnd) {
  if (pairs.length <= limitEachEnd * 2) return pairs;
  return [...pairs.slice(0, limitEachEnd), ...pairs.slice(-limitEachEnd)];
}

// Picks up to `max` builds spread evenly across a price-sorted list rather
// than just the `max` cheapest — a customer's budget should see the full
// range of what's achievable (cheapest through priciest-still-affordable),
// not a cluster of near-identical cheap options with nothing above them.
function spreadAcrossRange(sorted, max) {
  if (sorted.length <= max) return sorted;
  const picked = [];
  for (let i = 0; i < max; i++) {
    const idx = Math.round((i * (sorted.length - 1)) / (max - 1));
    picked.push(sorted[idx]);
  }
  return [...new Set(picked)];
}

function compatibleCandidates(category, catalogByCategory, ctx) {
  const list = catalogByCategory.get(category) || [];
  switch (category) {
    case "RAM":
      return list.filter((r) =>
        ramTypeMatches(detectRamType(r), detectRamType(ctx.board)),
      );
    case "CPU Cooler":
      return list.filter((c) =>
        coolerFitsCpu(detectSocketSet(c), ctx.cpuSocket),
      );
    case "Case":
      return list.filter((c) =>
        caseFitsBoard(detectFormFactor(c), detectFormFactor(ctx.board)),
      );
    case "PSU":
      return list.filter((p) => psuSufficient(p, ctx.cpu, ctx.gpu));
    default:
      return list; // GPU, Storage, Case Fans have no modeled cross-dependency
  }
}

function partReason(category) {
  const reasons = {
    CPU: "Core processor for the build",
    Motherboard: "Compatible motherboard matched by socket",
    GPU: "Graphics performance for your usecase",
    RAM: "Memory sized for smooth multitasking",
    Storage: "Storage for OS, apps and files",
    PSU: "Power supply sized for the chosen parts",
    "CPU Cooler": "Keeps the CPU cool under load",
    Case: "Houses every component, fits the motherboard",
    "Case Fans": "Improves case airflow",
  };
  return reasons[category] || "Selected for this build";
}

function partEntry(category, item, quantity) {
  const price = Number(item.price) || 0;
  const qty = quantity || 1;
  return {
    category,
    name: item.name,
    price,
    quantity: qty,
    totalPrice: price * qty,
    reason: partReason(category),
    // Present only for products synced via the WooCommerce plugin — lets
    // the widget add this exact part to the store's real cart. Manually
    // uploaded (CSV/Excel/PDF) products won't have one.
    wooId: item.woo_id || null,
  };
}

const FILL_ORDER = [
  "GPU",
  "RAM",
  "Storage",
  "PSU",
  "CPU Cooler",
  "Case",
  "Case Fans",
];

// The cheapest fully compatible build for a fixed CPU+Motherboard anchor —
// every category just takes its cheapest compatible option (or, with a
// fixed-GPU catalog — see catalogWithFixedGpu — that one specific GPU).
// This is what every build in generateBuildsFromCatalog is built from.
function cheapestFillFromPair(catalogByCategory, pair, skipCategories) {
  const skip = skipCategories || EMPTY_SKIP_SET;
  const ctx = {
    cpu: pair.cpu,
    board: pair.board,
    cpuSocket: pair.cpuSocket,
    boardSocket: pair.boardSocket,
    gpu: null,
  };
  const parts = [partEntry("CPU", pair.cpu), partEntry("Motherboard", pair.board)];
  const missing = [];
  let spent = pair.cpu.price + pair.board.price;

  FILL_ORDER.forEach((category) => {
    if (skip.has(category)) {
      missing.push({ category, reason: "excluded_for_budget" });
      return;
    }
    if (category === "CPU Cooler" && cpuHasBundledCooler(ctx.cpu)) {
      missing.push({ category, reason: "not_needed" });
      return;
    }
    if (category === "Case Fans" && ctx.case && caseIncludesFans(ctx.case)) {
      missing.push({ category, reason: "not_needed" });
      return;
    }
    const allInCat = catalogByCategory.get(category) || [];
    const compatible = compatibleCandidates(category, catalogByCategory, ctx);
    if (!compatible.length) {
      missing.push({
        category,
        reason: allInCat.length ? "no_compatible_match" : "not_in_inventory",
      });
      return;
    }
    const chosen = compatible[0]; // category lists are pre-sorted ascending by price
    parts.push(partEntry(category, chosen));
    spent += chosen.price;
    if (category === "GPU") ctx.gpu = chosen;
    if (category === "Case") ctx.case = chosen;
  });

  return { parts, total: spent, missing, ctx };
}
const EMPTY_SKIP_SET = new Set();

// Hard safety net: guarantees the final total never exceeds budget by
// swapping in the next-cheapest compatible alternative for whichever
// part currently offers the biggest saving, repeating until in-budget.
function enforceBudgetCap(result, catalogByCategory, budget) {
  const parts = result.parts.map((p) => ({ ...p }));
  const ctx = result.ctx;
  let total = parts.reduce((s, p) => s + p.totalPrice, 0);
  let guard = 0;
  while (total > budget && guard < 60) {
    guard++;
    let bestIdx = -1;
    let bestItem = null;
    let bestSaving = 0;
    parts.forEach((part, i) => {
      if (part.category === "CPU" || part.category === "Motherboard") return;
      const cheaper = compatibleCandidates(part.category, catalogByCategory, ctx)
        .filter((c) => c.price < part.price)
        .sort((a, b) => a.price - b.price);
      if (cheaper.length) {
        const saving = (part.price - cheaper[0].price) * (part.quantity || 1);
        if (saving > bestSaving) {
          bestSaving = saving;
          bestIdx = i;
          bestItem = cheaper[0];
        }
      }
    });
    if (bestIdx === -1) break;
    parts[bestIdx] = partEntry(parts[bestIdx].category, bestItem, parts[bestIdx].quantity);
    total = parts.reduce((s, p) => s + p.totalPrice, 0);
  }
  return { ...result, parts, total };
}

// The final PSU choice (cheapest compatible, from cheapestFillFromPair)
// could in principle not cover the actual CPU+GPU wattage draw if
// psuSufficient's estimate and the plain price-sort disagree — check once
// more and swap in the cheapest still-affordable PSU that does, if needed.
function ensurePsuSufficient(result, catalogByCategory, budget) {
  const psuIdx = result.parts.findIndex((p) => p.category === "PSU");
  if (psuIdx === -1) return result;
  const psuPart = result.parts[psuIdx];
  if (psuSufficient({ name: psuPart.name, description: "", price: psuPart.price }, result.ctx.cpu, result.ctx.gpu)) {
    return result;
  }
  const sufficient = compatibleCandidates("PSU", catalogByCategory, result.ctx);
  if (!sufficient.length) return result; // nothing better available — best effort
  const parts = result.parts.map((p, i) =>
    i === psuIdx ? partEntry("PSU", sufficient[0], p.quantity) : p,
  );
  const total = parts.reduce((s, p) => s + p.totalPrice, 0);
  return enforceBudgetCap({ ...result, parts, total }, catalogByCategory, budget);
}

// `rank`/`count` replace the old fixed "Budget/Balanced/Max" tier concept —
// there's no longer a fixed number of builds, so naming/messaging is
// derived from where this build actually falls (cheapest, priciest-
// affordable, or in between) among however many came back this time.
function finalizeBuild(b, rank, count, budget, anyPricierBuildHasGpu) {
  const totalPrice = Math.round(b.total);
  const withinBudget = totalPrice <= budget;
  const budgetRemaining = budget - totalPrice;
  // "excluded_for_budget" (currently only GPU) and "not_needed" (CPU Cooler/
  // Case Fans the build genuinely doesn't need) parts are deliberate
  // omissions, not gaps in the store's stock — kept out of
  // missingCategories/missingNote (which read as "not available in store")
  // and surfaced separately via their own notes below.
  const missingCategories = b.missing
    .filter((m) => m.reason !== "excluded_for_budget" && m.reason !== "not_needed")
    .map((m) => m.category);
  const compatible = !b.missing.some((m) => REQUIRED_SET.has(m.category));
  // socketsMatch() treats a missing socket string on either side as "don't
  // block the pairing" rather than "confirmed compatible" — reasonable for
  // not over-rejecting real matches when a listing's text is sparse, but
  // it means `compatible` alone can't tell a genuinely verified CPU/board
  // pairing apart from one that was simply never contradicted. Surfaced
  // separately so the widget can be honest about the difference instead of
  // claiming "all parts verified compatible" for a pairing that was really
  // just assumed.
  const socketVerified = !!(b.ctx?.cpuSocket && b.ctx?.boardSocket);

  const isCheapest = rank === 0;
  const isPriciest = rank === count - 1;
  const cpuName = b.ctx?.cpu?.name || "this CPU";
  const gpuName = b.ctx?.gpu?.name || null;

  // Named for what actually distinguishes it (its CPU/GPU) rather than a
  // fixed tier label, since two builds a customer is choosing between are
  // most often actually differentiated by exactly those two parts.
  const buildName = gpuName ? `${cpuName} + ${gpuName}` : `${cpuName} (No GPU)`;

  const tagline = isCheapest
    ? "Most affordable option"
    : isPriciest
      ? "Best this store can offer within your budget"
      : "Compatible option within your budget";

  const summaryBase = isCheapest
    ? "The most economical complete build for your needs, using this store's cheapest compatible parts."
    : isPriciest
      ? "The best combination of parts this store can offer, as close to your full budget as possible."
      : `A step up from the cheapest option, built around a ${gpuName ? "different GPU" : "different CPU"} this store has in stock.`;

  const missingNote = missingCategories.length
    ? ` Not available in the store's current inventory: ${missingCategories.join(", ")}.`
    : "";

  const gpuExcludedForBudget = b.missing.some(
    (m) => m.category === "GPU" && m.reason === "excluded_for_budget",
  );
  const gpuBudgetNote = gpuExcludedForBudget
    ? (() => {
        const igpu = integratedGraphicsStatus(b.ctx.cpu);
        // Two genuinely different situations read very differently: a
        // no-GPU build sitting among pricier GPU-equipped options in the
        // SAME result set is just this ladder's cheap end, not a shortfall
        // — saying "didn't fit your budget" there is actively wrong, since
        // the customer's budget clearly did afford a GPU (see the pricier
        // cards). That framing is only accurate for the one case where no
        // build at any price up to the full budget could include a GPU.
        const opening = anyPricierBuildHasGpu
          ? "This is a lower-cost option without a graphics card — see the pricier builds below for one that includes a GPU."
          : "No graphics card in this build — adding one would push it over your budget with the store's current stock.";
        if (igpu === "present")
          return ` ${opening} This CPU has built-in (integrated) graphics, so you'll still get a display either way.`;
        if (igpu === "none")
          return ` ${opening} This CPU does NOT have integrated graphics, so you will need to add a graphics card separately (even a cheap one) to get any display output.`;
        return ` ${opening} Please confirm this CPU has integrated graphics before buying; if it doesn't, you'll need a separate graphics card for a display signal.`;
      })()
    : "";

  const notNeededCategories = b.missing
    .filter((m) => m.reason === "not_needed")
    .map((m) => m.category);
  const notNeededNote = notNeededCategories
    .map((c) =>
      c === "CPU Cooler"
        ? " No separate CPU cooler included — this CPU already ships with its own stock cooler, which is enough for standard use."
        : c === "Case Fans"
          ? " No extra case fans included — the chosen case already comes with fans pre-installed."
          : "",
    )
    .join("");

  return {
    buildIndex: rank,
    tagline,
    buildName,
    totalPrice,
    withinBudget,
    budgetRemaining,
    compatible,
    socketVerified,
    compatibilityNote: compatible
      ? socketVerified
        ? ""
        : "The CPU and motherboard listings didn't both state a socket, so this pairing wasn't fully verified — double-check compatibility before buying."
      : `This store's inventory is missing required parts: ${missingCategories.join(", ")}.`,
    parts: b.parts,
    missingCategories,
    gpuExcludedForBudget,
    summary: summaryBase + missingNote + gpuBudgetNote + notNeededNote,
    tips: isCheapest
      ? "Every part here was picked to keep cost as low as possible while staying compatible."
      : isPriciest
        ? "This build spends as much of your budget as possible on better parts, while staying compatible and within budget."
        : `A different ${gpuName ? "GPU" : "CPU"} choice than the cheapest option, still fully compatible and within your budget.`,
    budgetAdvice:
      budgetRemaining > 0
        ? `${Math.round(budgetRemaining).toLocaleString()} left over from your budget.`
        : "Uses your full budget.",
  };
}

// Max number of distinct builds ever returned in one response — not a
// target to fill, just a ceiling so a large, varied catalog doesn't hand
// the customer a scroll of 40 near-identical cards. Real catalogs with
// modest variety will naturally return fewer.
const MAX_BUILDS_SHOWN = 12;

// Realistic per-category quantity ceilings — a real PC has 2-4 RAM slots
// and room for a handful of case fans, never dozens.
const MAX_QUANTITY = { RAM: 4, "Case Fans": 6 };

function compatibleCpusForBoard(catalogByCategory, boardSocket) {
  return (catalogByCategory.get("CPU") || []).filter((c) =>
    socketsMatch(detectSocket(c), boardSocket),
  );
}

function compatibleBoardsForCpu(catalogByCategory, cpuSocket, ramType, formFactor) {
  return (catalogByCategory.get("Motherboard") || []).filter((b) => {
    if (!socketsMatch(detectSocket(b), cpuSocket)) return false;
    const bRam = detectRamType(b);
    if (ramType && bRam && bRam !== ramType) return false;
    const bFF = detectFormFactor(b);
    if (formFactor && bFF && bFF !== formFactor) return false;
    return true;
  });
}

// Finds the single cheapest possible next step up from the current build
// — CPU swap, Motherboard swap, a swap in any other present category, or
// one more unit of RAM/Case Fans; GPU is deliberately handled separately
// (see climbAndSnapshot's two phases below), never as one of these
// candidates. A GPU-add is a single lump price jump (the card's whole
// price) rather than a small step, so if it competed here on raw delta
// size it would almost always lose to dozens of tiny swaps elsewhere and
// only get added once every other category was already maxed out —
// nowhere near where a customer would expect a graphics card to show up.
function cheapestNextStep(parts, ctx, catalogByCategory) {
  const candidates = [];

  const cpuPart = parts.find((p) => p.category === "CPU");
  const betterCpu = compatibleCpusForBoard(catalogByCategory, ctx.boardSocket)
    .filter((c) => c.price > cpuPart.price)
    .sort((a, b) => a.price - b.price)[0];
  if (betterCpu) {
    candidates.push({
      delta: betterCpu.price - cpuPart.price,
      apply: (p, c) => {
        p[p.findIndex((x) => x.category === "CPU")] = partEntry("CPU", betterCpu);
        c.cpu = betterCpu;
        c.cpuSocket = detectSocket(betterCpu);
      },
    });
  }

  const boardPart = parts.find((p) => p.category === "Motherboard");
  const betterBoard = compatibleBoardsForCpu(
    catalogByCategory,
    ctx.cpuSocket,
    detectRamType(ctx.board),
    detectFormFactor(ctx.board),
  )
    .filter((b) => b.price > boardPart.price)
    .sort((a, b) => a.price - b.price)[0];
  if (betterBoard) {
    candidates.push({
      delta: betterBoard.price - boardPart.price,
      apply: (p, c) => {
        p[p.findIndex((x) => x.category === "Motherboard")] = partEntry("Motherboard", betterBoard);
        c.board = betterBoard;
        c.boardSocket = detectSocket(betterBoard);
      },
    });
  }

  const gpuPart = parts.find((p) => p.category === "GPU");
  if (gpuPart) {
    const betterGpu = compatibleCandidates("GPU", catalogByCategory, ctx)
      .filter((g) => g.price > gpuPart.price)[0];
    if (betterGpu) {
      candidates.push({
        delta: betterGpu.price - gpuPart.price,
        apply: (p, c) => {
          p[p.findIndex((x) => x.category === "GPU")] = partEntry("GPU", betterGpu);
          c.gpu = betterGpu;
        },
      });
    }
  }

  ["RAM", "Storage", "PSU", "CPU Cooler", "Case", "Case Fans"].forEach((category) => {
    const part = parts.find((p) => p.category === category);
    if (!part) return;
    const better = compatibleCandidates(category, catalogByCategory, ctx)
      .filter((c) => c.price > part.price)
      .sort((a, b) => a.price - b.price)[0];
    if (better) {
      candidates.push({
        delta: (better.price - part.price) * (part.quantity || 1),
        apply: (p) => {
          const idx = p.findIndex((x) => x.category === category);
          p[idx] = partEntry(category, better, p[idx].quantity);
        },
      });
    }
    const qtyCap = MAX_QUANTITY[category];
    if (qtyCap) {
      // RAM must stay in matched pairs once it has more than one stick —
      // jump straight from 2 to 4 rather than an odd count that disables
      // dual-channel operation.
      const addAmount = category === "RAM" && part.quantity === 2 ? 2 : 1;
      if (part.quantity + addAmount <= qtyCap) {
        candidates.push({
          delta: part.price * addAmount,
          apply: (p) => {
            const idx = p.findIndex((x) => x.category === category);
            p[idx].quantity += addAmount;
            p[idx].totalPrice = p[idx].price * p[idx].quantity;
          },
        });
      }
    }
  });

  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (a.delta <= b.delta ? a : b));
}

// Climbs from the cheapest complete build up to `budget` in two phases,
// recording a snapshot whenever the price has moved far enough from the
// last one to be worth showing as a distinct option (minGap scales with
// the budget so a small and a large budget both get a handful of
// meaningfully spaced options, not dozens of near-identical ones or one
// fixed peso amount that's too coarse/fine depending on scale):
//
// Phase 1 — no GPU yet. Climbs every OTHER category via cheapestNextStep
// while a GPU still wouldn't fit remaining budget, re-checking after each
// step whether the cheapest compatible GPU now would. The moment it
// would, that's the transition: the GPU gets added right there — not
// competing against smaller swaps on raw price delta (see
// cheapestNextStep's comment for why that would badly mis-time it), but
// triggered specifically by "can we afford one yet".
//
// Phase 2 — GPU included. Keeps climbing (now including GPU swaps) the
// same way up to the budget ceiling.
function climbAndSnapshot(startFloor, catalogByCategory, budget) {
  let parts = startFloor.parts.map((p) => ({ ...p }));
  let ctx = { ...startFloor.ctx };
  let total = parts.reduce((s, p) => s + p.totalPrice, 0);
  const baseMissing = startFloor.missing;

  // Once a GPU has actually been added during the climb, the floor's
  // original "excluded_for_budget" GPU entry no longer describes this
  // snapshot — dropping it here (rather than carrying it forward
  // unchanged) is what keeps gpuExcludedForBudget accurate per-snapshot
  // instead of stuck at whatever the very first build looked like.
  const snapshot = () => {
    const hasGpu = parts.some((p) => p.category === "GPU");
    const missing = hasGpu ? baseMissing.filter((m) => m.category !== "GPU") : baseMissing;
    return { parts: parts.map((p) => ({ ...p })), total, missing, ctx: { ...ctx } };
  };

  const applyStep = (step) => {
    step.apply(parts, ctx);
    const afterPsu = ensurePsuSufficient(
      { parts, total: parts.reduce((s, p) => s + p.totalPrice, 0), missing: baseMissing, ctx },
      catalogByCategory,
      budget,
    );
    parts = afterPsu.parts;
    total = afterPsu.total;
  };

  const snapshots = [snapshot()];
  const minGap = Math.max(budget * 0.15, 2000);
  let lastSnapshotTotal = total;
  let guard = 0;
  const maxGuard = 2000; // steps are cheap (a few array scans each) — this bounds runaway loops, not realistic catalogs

  // Phase 1
  while (guard < maxGuard) {
    const cheapestGpu = compatibleCandidates("GPU", catalogByCategory, ctx)[0];
    if (cheapestGpu && total + cheapestGpu.price <= budget) {
      guard++;
      applyStep({
        apply: (p, c) => {
          p.push(partEntry("GPU", cheapestGpu));
          c.gpu = cheapestGpu;
        },
      });
      // Always record the transition itself, regardless of minGap spacing
      // — "a GPU just became available" is meaningful on its own even if
      // the price barely moved.
      snapshots.push(snapshot());
      lastSnapshotTotal = total;
      break;
    }
    if (total >= budget) break;
    const step = cheapestNextStep(parts, ctx, catalogByCategory);
    if (!step || total + step.delta > budget) break;
    guard++;
    applyStep(step);
    if (total - lastSnapshotTotal >= minGap) {
      snapshots.push(snapshot());
      lastSnapshotTotal = total;
    }
  }

  // Phase 2
  while (total < budget && guard < maxGuard) {
    guard++;
    const step = cheapestNextStep(parts, ctx, catalogByCategory);
    if (!step || total + step.delta > budget) break;
    applyStep(step);
    if (total - lastSnapshotTotal >= minGap) {
      snapshots.push(snapshot());
      lastSnapshotTotal = total;
    }
  }

  // Always keep the final reached state — the priciest thing the store
  // can actually offer within budget — even if it landed closer than
  // minGap to the last recorded snapshot, since it's the ceiling and
  // worth showing regardless of spacing.
  if (snapshots[snapshots.length - 1].total !== total) {
    snapshots.push(snapshot());
  }

  return snapshots;
}

function generateBuildsFromCatalog(products, budget) {
  const catalogByCategory = buildCatalogByCategory(products);

  const cpus = catalogByCategory.get("CPU") || [];
  const boards = catalogByCategory.get("Motherboard") || [];
  const pairs = compatiblePairs(cpus, boards);

  if (!cpus.length || !boards.length || !pairs.length) {
    const missingHere = [];
    if (!cpus.length) missingHere.push("CPU");
    if (!boards.length) missingHere.push("Motherboard");
    const noBuildsReason = missingHere.length
      ? `This store's inventory is missing: ${missingHere.join(", ")}. Add products in ${missingHere.length > 1 ? "these categories" : "this category"} to enable PC builds.`
      : "None of the CPUs in this store's inventory share a matching socket with any motherboard (e.g. LGA1700, AM5), so a complete build can't be assembled. Check the socket details in the product names or descriptions.";
    return { canBuild: false, noBuildsReason, builds: [] };
  }

  const requiredMissing = (floor) =>
    floor.missing.some((m) => REQUIRED_SET.has(m.category));

  // The cheapest CPU+board pair that can even complete a full
  // required-category build (pairs are already cost-sorted ascending —
  // see compatiblePairs) becomes the floor the whole price ladder climbs
  // from. Capped the same way evaluablePairs always has been — the true
  // cheapest feasible pair is essentially always among the cheapest ones
  // by raw cost.
  const candidatePairs = evaluablePairs(pairs, 150);
  let startFloor = null;
  for (const pair of candidatePairs) {
    const noGpu = cheapestFillFromPair(catalogByCategory, pair, new Set(["GPU"]));
    if (!requiredMissing(noGpu)) {
      startFloor = noGpu;
      break;
    }
  }

  if (!startFloor) {
    const missingSet = new Map();
    candidatePairs.forEach((pair) => {
      cheapestFillFromPair(catalogByCategory, pair, new Set(["GPU"])).missing.forEach((m) => {
        if (REQUIRED_SET.has(m.category)) missingSet.set(m.category, m.reason);
      });
    });
    const names = [...missingSet.keys()];
    const notInInventory = names.filter(
      (n) => missingSet.get(n) === "not_in_inventory",
    );
    const noBuildsReason = notInInventory.length
      ? `This store's inventory is missing: ${notInInventory.join(", ")}. A complete PC build needs at least one product in every core category.`
      : `We couldn't find a combination where ${names.join(", ")} are compatible with the rest of the build. Double-check specs like memory type (DDR4/DDR5) or case form factor in your product descriptions.`;
    return { canBuild: false, noBuildsReason, builds: [] };
  }

  if (startFloor.total > budget) {
    const cheapestTotal = Math.round(startFloor.total);
    const shortfall = Math.round(startFloor.total - budget);
    return {
      canBuild: false,
      noBuildsReason: `The cheapest complete PC we can build from this store's inventory costs about ${cheapestTotal.toLocaleString()}, which is ${shortfall.toLocaleString()} more than your budget. Try increasing your budget, or ask the store to stock more affordable parts.`,
      builds: [],
    };
  }

  // Climbs from that floor to the customer's budget, recording a
  // snapshot at every meaningfully-priced step along the way (see
  // climbAndSnapshot/cheapestNextStep) — a GPU gets introduced at
  // whatever price point is genuinely the cheapest place to add one,
  // rather than at a fixed budget percentage, so the customer sees the
  // real range of what this store can build for their money instead of a
  // fixed count of tiers that could leave a big, meaningless gap.
  const snapshots = climbAndSnapshot(startFloor, catalogByCategory, budget);
  // Safety net, not the normal path — minGap spacing inside
  // climbAndSnapshot already keeps this well under the cap for any
  // realistic catalog.
  const selected = spreadAcrossRange(snapshots, MAX_BUILDS_SHOWN);

  const anyBuildHasGpu = selected.some((b) => b.ctx?.gpu);
  const finalBuilds = selected.map((b, i) =>
    finalizeBuild(b, i, selected.length, budget, anyBuildHasGpu),
  );

  // Signals when the store's own inventory, not the customer's budget, is
  // what capped the list — e.g. a 200,000 budget where the priciest build
  // this store can assemble only reaches 98,000 leaves real headroom
  // unused, which reads as a glitch ("why only cheap options for such a
  // big budget?") unless it's explained.
  const priciestAffordable = snapshots[snapshots.length - 1].total;
  const inventoryCeilingNote =
    priciestAffordable < budget * 0.9
      ? `This store's best available build for your needs costs ${Math.round(priciestAffordable).toLocaleString()} — a bigger budget won't unlock anything more from their current inventory.`
      : "";

  return { canBuild: true, noBuildsReason: "", builds: finalBuilds, inventoryCeilingNote };
}

// Simple In-Memory IP Rate Limiter (15 requests per hour per IP)
const ipRequests = new Map();
setInterval(() => ipRequests.clear(), 60 * 60 * 1000);

router.post("/recommend", async (req, res) => {
  const ip = req.ip; // trust-proxy aware (see app.set("trust proxy", 1) in index.js)
  const currentRequests = ipRequests.get(ip) || 0;

  if (currentRequests >= 15) {
    return res.status(429).json({
      error:
        "Our AI is currently taking a rest. Please try again later or contact the store.",
      customerMessage: true,
      limitReached: false,
    });
  }

  ipRequests.set(ip, currentRequests + 1);

  const { budget, purpose: rawPurpose, extras, storeId } = req.body;
  // Both are freeform request-body fields, typed and length-capped the
  // same way regardless of what the caller sends since nothing downstream
  // should ever see a non-string or an unbounded string here. purpose no
  // longer affects build generation itself (see generateBuildsFromCatalog)
  // — it's kept only because analyticsDB.logRecommendation persists it for
  // the dashboard's "Popular Purposes" stat.
  const safeExtras = (typeof extras === "string" ? extras : "").trim().slice(0, 200);
  const purpose = (typeof rawPurpose === "string" ? rawPurpose : "").trim().slice(0, 100);

  if (!budget || !purpose || !storeId) {
    return res
      .status(400)
      .json({ error: "budget, purpose and storeId required" });
  }

  try {
    const maintenanceMode = await configDB.get("maintenance_mode", "false");
    if (maintenanceMode === "true") {
      return res.status(503).json({
        error:
          "Our service is temporarily under maintenance. Please try again later.",
        customerMessage: true,
      });
    }
  } catch (_) {}

  const parsedBudget = Number(budget);
  if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
    return res.status(400).json({
      error: "Please enter a valid budget amount.",
      customerMessage: true,
    });
  }

  try {
    const store = await storeDB.findById(storeId);
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const isActive = await storeDB.isActive(storeId);
    if (!isActive) {
      return res.status(403).json({
        error: "Service temporarily unavailable.",
        customerMessage: true,
      });
    }

    if (store.widget_enabled === 0) {
      return res.status(403).json({
        error: "Service temporarily unavailable.",
        customerMessage: true,
      });
    }

    const products = await productDB.getByStore(storeId);
    if (!products.length) {
      return res.status(404).json({
        error: "This store has not added any products to their catalog yet.",
        customerMessage: true,
      });
    }

    const currency = store.currency || "PKR";
    const cachedRec = await analyticsDB.getCachedRecommendation(
      storeId,
      parsedBudget,
      purpose,
      safeExtras,
    );
    // A cache entry from before builds switched from fixed tiers to
    // buildIndex (see generateBuildsFromCatalog) would serve builds here
    // that /order-request can no longer correctly match — it regenerates
    // fresh and looks up by array position, which isn't guaranteed to
    // line up with whatever an old-format cached list showed the
    // customer. Treating it as a miss rather than serving it self-heals
    // the moment this runs (a fresh entry gets cached in the new format
    // below), instead of staying wrong until the store's catalog happens
    // to change.
    const cacheIsCurrentFormat =
      cachedRec &&
      (!Array.isArray(cachedRec.builds) ||
        cachedRec.builds.every((b) => typeof b.buildIndex === "number"));

    if (cachedRec && cacheIsCurrentFormat) {
      const buildsToServe = Array.isArray(cachedRec.builds)
        ? cachedRec.builds
        : cachedRec.buildName
          ? [
              {
                ...cachedRec,
                tagline:
                  cachedRec.tagline || "Previously generated recommendation",
              },
            ]
          : [];

      return res.json({
        success: true,
        builds: buildsToServe,
        canBuild: cachedRec.canBuild !== false,
        noBuildsReason: cachedRec.noBuildsReason || "",
        inventoryCeilingNote: cachedRec.inventoryCeilingNote || "",
        currency,
        cached: true,
      });
    }

    const generated = generateBuildsFromCatalog(products, parsedBudget);
    const payload = {
      success: true,
      builds: generated.builds,
      canBuild: generated.canBuild,
      noBuildsReason: generated.noBuildsReason,
      inventoryCeilingNote: generated.inventoryCeilingNote || "",
      currency,
    };

    await analyticsDB.logRecommendation(
      storeId,
      parsedBudget,
      purpose,
      safeExtras,
      payload,
      { source: "inventory" },
    );
    res.json(payload);
  } catch (err) {
    console.error("Recommend handler error:", err.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Service temporarily unavailable. Please try again.",
        customerMessage: true,
      });
    }
  }
});

// ─── ORDER REQUEST (public, for widget) ──────────────────────────
// Called the moment a customer clicks "Order This Build". Deliberately
// ignores any parts/price the client sends — a customer could edit the
// WhatsApp message before sending it, so the only trustworthy total is
// one recomputed here, fresh, from the store's real catalog. This becomes
// the store owner's ground truth to cross-check an order message against.
router.post("/order-request", async (req, res) => {
  const ip = req.ip; // trust-proxy aware (see app.set("trust proxy", 1) in index.js)
  const currentRequests = ipRequests.get(ip) || 0;
  if (currentRequests >= 15) {
    return res.status(429).json({
      error: "Too many requests. Please try again later or contact the store.",
      customerMessage: true,
    });
  }
  ipRequests.set(ip, currentRequests + 1);

  const { storeId, budget, buildIndex, orderMethod } = req.body;
  const parsedIndex = Number(buildIndex);
  if (!storeId || !budget || !Number.isInteger(parsedIndex) || parsedIndex < 0) {
    return res
      .status(400)
      .json({ error: "storeId, budget and buildIndex are required" });
  }

  const parsedBudget = Number(budget);
  if (!Number.isFinite(parsedBudget) || parsedBudget <= 0) {
    return res
      .status(400)
      .json({ error: "Invalid budget.", customerMessage: true });
  }

  try {
    const store = await storeDB.findById(storeId);
    if (!store) return res.status(404).json({ error: "Store not found" });

    const isActive = await storeDB.isActive(storeId);
    if (!isActive || store.widget_enabled === 0) {
      return res
        .status(403)
        .json({ error: "Service temporarily unavailable.", customerMessage: true });
    }

    const products = await productDB.getByStore(storeId);
    if (!products.length) {
      return res.status(404).json({
        error: "This store has not added any products to their catalog yet.",
        customerMessage: true,
      });
    }

    const generated = generateBuildsFromCatalog(products, parsedBudget);
    if (!generated.canBuild) {
      return res.status(400).json({
        error: "Could not recreate this build — the store's inventory may have changed.",
        customerMessage: true,
      });
    }

    // Builds are regenerated fresh from the real catalog here — never
    // trusting parts/price the client might send — so buildIndex only
    // needs to identify WHICH of the fresh results the customer picked,
    // the same way it did in the response /recommend just gave them
    // (same storeId+budget deterministically produces the same sorted
    // list). If the catalog changed in between, the index may no longer
    // match the same build the customer actually saw — caught below.
    const matched = generated.builds[parsedIndex];
    if (!matched) {
      return res
        .status(400)
        .json({ error: "Could not find that build.", customerMessage: true });
    }

    const method = orderMethod === "woo" ? "woo" : "whatsapp";
    const buildWithCurrency = { ...matched, currency: store.currency || "PKR" };
    const orderId = await orderRequestDB.create(storeId, buildWithCurrency, method);

    res.json({
      success: true,
      orderId,
      orderSig: signOrderId(orderId),
      build: buildWithCurrency,
    });
  } catch (err) {
    console.error("Order-request handler error:", err.message || err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Service temporarily unavailable. Please try again.",
        customerMessage: true,
      });
    }
  }
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[ch]);
}

// ─── ORDER VIEW (public, signed link) ────────────────────────────
// What the WhatsApp message's link points to. Renders the exact same
// server-computed order_requests row a store owner would otherwise have
// to find in the dashboard's Orders tab — reachable straight from the
// WhatsApp chat, and immune to whatever the customer edited (or deleted)
// in the message text around it, since the link itself carries no
// customer-supplied data at all. Registered directly on the app at a
// short, un-prefixed path (see server/index.js) rather than under
// /api/order/... — this is the one route whose URL a real person actually
// reads and taps, so it's worth keeping off the API namespace.
async function handleOrderView(req, res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || req.params.sig !== signOrderId(id)) {
    return res.status(404).send("<p>Order not found.</p>");
  }

  const order = await orderRequestDB.getByIdPublic(id);
  if (!order) return res.status(404).send("<p>Order not found.</p>");

  const rows = (order.parts || [])
    .map((p) => {
      const qty = p.quantity || 1;
      const total = p.totalPrice || p.price * qty;
      return `
        <tr style="border-bottom:1px solid #e0e0e0;">
          <td style="padding:8px 10px; color:#666; font-size:11px; text-transform:uppercase;">${escapeHtml(p.category)}</td>
          <td style="padding:8px 10px;">${escapeHtml(p.name)}${qty > 1 ? ` × ${qty}` : ""}</td>
          <td style="padding:8px 10px; text-align:right; font-weight:600;">${escapeHtml(order.currency)} ${Number(total).toLocaleString()}</td>
        </tr>`;
    })
    .join("");

  res.send(`<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Order #${id}</title></head>
<body style="font-family:'Inter',Arial,sans-serif; max-width:600px; margin:0 auto; padding:24px; color:#111;">
  <div style="font-size:11px; color:#888; text-transform:uppercase; letter-spacing:0.5px;">Order #${id} — verified, unedited</div>
  <h1 style="font-size:20px; margin:6px 0 2px;">${escapeHtml(order.build_name)}</h1>
  <div style="color:#666; font-size:13px; margin-bottom:16px;">Placed ${escapeHtml(new Date(order.created_at).toLocaleString())}</div>
  <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
    <thead><tr style="background:#f5f5f5;">
      <th style="padding:8px 10px; text-align:left; font-size:11px; text-transform:uppercase;">Category</th>
      <th style="padding:8px 10px; text-align:left; font-size:11px; text-transform:uppercase;">Part</th>
      <th style="padding:8px 10px; text-align:right; font-size:11px; text-transform:uppercase;">Price</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="background:#edf7f2; border:1px solid #1a7a4a; color:#1a7a4a; border-radius:10px; padding:14px; display:flex; justify-content:space-between; font-weight:700;">
    <span>Total</span><span>${escapeHtml(order.currency)} ${Number(order.total_price).toLocaleString()}</span>
  </div>
  <p style="color:#888; font-size:11px; margin-top:20px;">This page is generated directly from BuildVolt's records and cannot be edited by the customer.</p>
</body></html>`);
}

module.exports = router;
module.exports.generateBuildsFromCatalog = generateBuildsFromCatalog;
module.exports.handleOrderView = handleOrderView;
