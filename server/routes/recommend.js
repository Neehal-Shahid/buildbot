const express = require("express");
const {
  productDB,
  storeDB,
  analyticsDB,
  configDB,
  orderRequestDB,
} = require("../database");
const { normalizeCategory } = require("../lib/categories");

const router = express.Router();

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

// Rough real-world PC budget allocation, used as a starting point that
// gets nudged by the customer's chosen usecase (see getPurposeProfile).
const BASELINE_WEIGHTS = {
  CPU: 0.2,
  Motherboard: 0.1,
  GPU: 0.25,
  RAM: 0.09,
  Storage: 0.09,
  PSU: 0.08,
  "CPU Cooler": 0.05,
  Case: 0.1,
  "Case Fans": 0.04,
};

// Realistic per-category quantity ceilings — a real PC has 2-4 RAM slots
// and room for a handful of case fans, never dozens.
const MAX_QUANTITY = { RAM: 4, "Case Fans": 6 };

function getPurposeProfile(purpose) {
  const text = String(purpose || "").toLowerCase();
  if (text.includes("gaming"))
    return {
      gpuBias: 1.25,
      cpuBias: 1.1,
      ramBias: 1.15,
      storageBias: 1.05,
      tag: "Gaming",
    };
  if (text.includes("video") || text.includes("edit"))
    return {
      gpuBias: 1.1,
      cpuBias: 1.1,
      ramBias: 1.2,
      storageBias: 1.2,
      tag: "Editing",
    };
  if (text.includes("coding") || text.includes("developer"))
    return {
      gpuBias: 0.95,
      cpuBias: 1.1,
      ramBias: 1.15,
      storageBias: 1.1,
      tag: "Coding",
    };
  if (text.includes("design") || text.includes("studio"))
    return {
      gpuBias: 1.1,
      cpuBias: 1.05,
      ramBias: 1.15,
      storageBias: 1.1,
      tag: "Design",
    };
  if (text.includes("stream"))
    return {
      gpuBias: 1.1,
      cpuBias: 1.1,
      ramBias: 1.12,
      storageBias: 1.08,
      tag: "Streaming",
    };
  if (text.includes("office"))
    return {
      gpuBias: 0.6,
      cpuBias: 1.0,
      ramBias: 1.05,
      storageBias: 1.15,
      tag: "Office",
    };
  if (text.includes("stud"))
    return {
      gpuBias: 0.7,
      cpuBias: 1.0,
      ramBias: 1.1,
      storageBias: 1.05,
      tag: "Studies",
    };
  return {
    gpuBias: 1.0,
    cpuBias: 1.0,
    ramBias: 1.0,
    storageBias: 1.0,
    tag: "General",
  };
}

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

function requiredPsuWattage(cpu, gpu) {
  const cpuW = detectWattage(cpu) || 65;
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

function computeWeights(purposeProfile) {
  const biasMap = {
    CPU: purposeProfile.cpuBias,
    GPU: purposeProfile.gpuBias,
    RAM: purposeProfile.ramBias,
    Storage: purposeProfile.storageBias,
  };
  const raw = {};
  let sum = 0;
  Object.entries(BASELINE_WEIGHTS).forEach(([cat, w]) => {
    raw[cat] = w * (biasMap[cat] || 1);
    sum += raw[cat];
  });
  const weights = {};
  Object.entries(raw).forEach(([cat, w]) => {
    weights[cat] = sum > 0 ? w / sum : 0;
  });
  return weights;
}

// CPU/Motherboard upgrades during the hill-climb (see climbToward) must keep
// the anchor pair itself compatible, so they get their own lookup instead of
// going through compatibleCandidates (which assumes a fixed anchor).
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
// every category just takes its cheapest compatible option. This is used
// both to find the Budget tier and, during the feasibility scan, to find
// which anchor pairs can even form a complete build at all.
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

// Finds the single next upgrade for one category: either the next pricier
// compatible part, or (for RAM/Case Fans, up to MAX_QUANTITY) one more unit
// of what's already chosen. Returns null once nothing more is available.
function nextUpgradeFor(category, part, catalogByCategory, ctx) {
  let swapOption = null;
  if (category === "CPU") {
    const better = compatibleCpusForBoard(catalogByCategory, ctx.boardSocket)
      .filter((c) => c.price > part.price)
      .sort((a, b) => a.price - b.price)[0];
    if (better) swapOption = { item: better, delta: better.price - part.price };
  } else if (category === "Motherboard") {
    const ramType = detectRamType(ctx.board);
    const formFactor = detectFormFactor(ctx.board);
    const better = compatibleBoardsForCpu(catalogByCategory, ctx.cpuSocket, ramType, formFactor)
      .filter((b) => b.price > part.price)
      .sort((a, b) => a.price - b.price)[0];
    if (better) swapOption = { item: better, delta: better.price - part.price };
  } else {
    const better = compatibleCandidates(category, catalogByCategory, ctx)
      .filter((c) => c.price > part.price)
      .sort((a, b) => a.price - b.price)[0];
    if (better) {
      // Swapping a >1-quantity part (e.g. RAM already bumped to 2 sticks)
      // changes the total by the per-unit delta times how many are bought.
      swapOption = { item: better, delta: (better.price - part.price) * (part.quantity || 1) };
    }
  }

  const qtyCap = MAX_QUANTITY[category];
  const addOption =
    qtyCap && part.quantity < qtyCap ? { addQuantity: true, delta: part.price } : null;

  // Prefer whichever costs less — both move the same category forward.
  const options = [swapOption, addOption].filter(Boolean);
  if (!options.length) return null;
  return options.reduce((a, b) => (a.delta <= b.delta ? a : b));
}

// Starting from a known-good complete build, visits categories highest
// purpose-weight first (e.g. GPU for Gaming) and climbs each one — next
// upgrade after next upgrade — as far as `ceiling` allows before moving to
// the next category. This mirrors how PC builders actually spend: get the
// best GPU you can justify first, then spend what's left on everything
// else, rather than nickel-and-diming the cheapest upgrade available at
// every step (which would waste a Gaming budget on extra case fans while
// leaving the GPU untouched). Balanced (ceiling ≈ 82% of budget) and Max
// (ceiling = budget) both climb from the same Budget-tier build, so Max
// simply continues further than Balanced — keeping totals naturally
// ordered Budget ≤ Balanced ≤ Max.
function climbToward(build, catalogByCategory, budget, ceiling, weights) {
  const parts = build.parts.map((p) => ({ ...p }));
  const ctx = { ...build.ctx };
  let total = parts.reduce((s, p) => s + p.totalPrice, 0);
  const cap = Math.min(budget, ceiling);

  const categoryOrder = Object.keys(weights).sort(
    (a, b) => (weights[b] || 0) - (weights[a] || 0),
  );

  categoryOrder.forEach((category) => {
    const idx = parts.findIndex((p) => p.category === category);
    if (idx === -1) return; // not part of this build (missing from inventory)
    let guard = 0;
    while (total < cap && guard < 30) {
      guard++;
      const upgrade = nextUpgradeFor(category, parts[idx], catalogByCategory, ctx);
      if (!upgrade || total + upgrade.delta > cap) break;
      if (upgrade.addQuantity) {
        parts[idx].quantity += 1;
        parts[idx].totalPrice = parts[idx].price * parts[idx].quantity;
      } else {
        parts[idx] = partEntry(category, upgrade.item, parts[idx].quantity);
        if (category === "CPU") {
          ctx.cpu = upgrade.item;
          ctx.cpuSocket = detectSocket(upgrade.item);
        }
        if (category === "Motherboard") {
          ctx.board = upgrade.item;
          ctx.boardSocket = detectSocket(upgrade.item);
        }
        if (category === "GPU") ctx.gpu = upgrade.item;
      }
      total = parts.reduce((s, p) => s + p.totalPrice, 0);
    }
  });

  return { parts, total, missing: build.missing, ctx };
}

// After CPU/GPU upgrades during the climb, the previously-chosen PSU could
// in principle no longer cover the new wattage draw — check once more and
// swap in the cheapest still-affordable PSU that does, if needed.
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

function finalizeBuild(b, tier, budget, purpose, purposeProfile) {
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

  const buildName =
    tier === "Budget Build"
      ? `${purposeProfile.tag} Value Build`
      : tier === "Balanced Build"
        ? `${purposeProfile.tag} Balanced Build`
        : `${purposeProfile.tag} Max Build`;

  const tagline =
    tier === "Budget Build"
      ? "Best value for money"
      : tier === "Balanced Build"
        ? "Balanced and reliable"
        : "Maximum performance within budget";

  const summaryBase =
    tier === "Budget Build"
      ? `The most economical complete build for ${purpose || "your needs"}, using this store's cheapest compatible parts.`
      : tier === "Balanced Build"
        ? `A balanced build that puts extra budget where it matters most for ${purpose || "your needs"}, without maxing out your spend.`
        : `A premium build that uses the best compatible parts this store can offer, as close to your full budget as possible.`;

  const missingNote = missingCategories.length
    ? ` Not available in the store's current inventory: ${missingCategories.join(", ")}.`
    : "";

  const gpuExcludedForBudget = b.missing.some(
    (m) => m.category === "GPU" && m.reason === "excluded_for_budget",
  );
  const gpuBudgetNote = gpuExcludedForBudget
    ? (() => {
        const igpu = integratedGraphicsStatus(b.ctx.cpu);
        if (igpu === "present")
          return ` No graphics card in this build — this CPU has built-in (integrated) graphics, so you'll still get a display; a graphics card wasn't added because doing so would push this build over your budget with the store's current stock.`;
        if (igpu === "none")
          return ` No graphics card in this build — adding one would push this build over your budget with the store's current stock, and this CPU does NOT have integrated graphics, so you will need to add a graphics card separately (even a cheap one) to get any display output.`;
        return ` No graphics card in this build — adding one would push this build over your budget with the store's current stock. Please confirm this CPU has integrated graphics before buying; if it doesn't, you'll need a separate graphics card for a display signal.`;
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
    tier,
    tagline,
    buildName,
    totalPrice,
    withinBudget,
    budgetRemaining,
    compatible,
    compatibilityNote: compatible
      ? ""
      : `This store's inventory is missing required parts: ${missingCategories.join(", ")}.`,
    parts: b.parts,
    missingCategories,
    gpuExcludedForBudget,
    summary: summaryBase + missingNote + gpuBudgetNote + notNeededNote,
    tips:
      tier === "Budget Build"
        ? "Every part here was picked to keep cost as low as possible while staying compatible."
        : tier === "Balanced Build"
          ? `Extra budget was prioritized toward ${purposeProfile.tag.toLowerCase()} performance.`
          : "This build spends as much of your budget as possible on better parts, while staying compatible and within budget.",
    budgetAdvice:
      budgetRemaining > 0
        ? `${Math.round(budgetRemaining).toLocaleString()} left over from your budget.`
        : "Uses your full budget.",
  };
}

function generateBuildsFromCatalog(products, budget, purpose) {
  const catalogByCategory = buildCatalogByCategory(products);
  const purposeProfile = getPurposeProfile(purpose);
  const weights = computeWeights(purposeProfile);

  const cpus = catalogByCategory.get("CPU") || [];
  const boards = catalogByCategory.get("Motherboard") || [];
  const pairs = compatiblePairs(cpus, boards);

  if (!cpus.length || !boards.length || !pairs.length) {
    const missingHere = [];
    if (!cpus.length) missingHere.push("CPU");
    if (!boards.length) missingHere.push("Motherboard");
    const noBuildsReason = missingHere.length
      ? `Your inventory is missing: ${missingHere.join(", ")}. Add products in ${missingHere.length > 1 ? "these categories" : "this category"} to enable PC builds.`
      : "None of the CPUs in your inventory share a matching socket with any motherboard (e.g. LGA1700, AM5), so a complete build can't be assembled. Check the socket details in your product names or descriptions.";
    return { canBuild: false, noBuildsReason, builds: [] };
  }

  const candidatePairs = evaluablePairs(pairs, 150);
  const evaluated = candidatePairs.map((pair) => ({
    pair,
    floor: cheapestFillFromPair(catalogByCategory, pair),
  }));

  const requiredMissing = (floor) =>
    floor.missing.some((m) => REQUIRED_SET.has(m.category));

  const feasible = evaluated.filter((e) => !requiredMissing(e.floor));

  if (!feasible.length) {
    const missingSet = new Map();
    evaluated.forEach((e) =>
      e.floor.missing.forEach((m) => {
        if (REQUIRED_SET.has(m.category)) missingSet.set(m.category, m.reason);
      }),
    );
    const names = [...missingSet.keys()];
    const notInInventory = names.filter(
      (n) => missingSet.get(n) === "not_in_inventory",
    );
    const noBuildsReason = notInInventory.length
      ? `Your inventory is missing: ${notInInventory.join(", ")}. A complete PC build needs at least one product in every core category.`
      : `We couldn't find a combination where ${names.join(", ")} are compatible with the rest of the build. Double-check specs like memory type (DDR4/DDR5) or case form factor in your product descriptions.`;
    return { canBuild: false, noBuildsReason, builds: [] };
  }

  let cheapestEntry = feasible.reduce(
    (min, e) => (e.floor.total < min.floor.total ? e : min),
    feasible[0],
  );

  // If even the cheapest build (including a discrete GPU) blows the budget,
  // try again with the GPU dropped — a cheaper CPU+board+RAM+storage+PSU+case
  // build without a graphics card may still fit, and is more useful to the
  // customer than a flat "can't build" refusal. Only worth trying when a
  // GPU was actually part of what pushed the cost over.
  if (
    cheapestEntry.floor.total > budget &&
    cheapestEntry.floor.parts.some((p) => p.category === "GPU")
  ) {
    const gpuSkip = new Set(["GPU"]);
    const noGpuFeasible = candidatePairs
      .map((pair) => ({
        pair,
        floor: cheapestFillFromPair(catalogByCategory, pair, gpuSkip),
      }))
      .filter((e) => !requiredMissing(e.floor) && e.floor.total <= budget);

    if (noGpuFeasible.length) {
      // Prefer anchor pairs whose CPU is known/likely to have integrated
      // graphics (so the customer still gets a display out of the box);
      // among equally-confident options, pick the cheapest.
      const igpuRank = { present: 2, unknown: 1, none: 0 };
      noGpuFeasible.sort((a, b) => {
        const rank =
          igpuRank[integratedGraphicsStatus(b.pair.cpu)] -
          igpuRank[integratedGraphicsStatus(a.pair.cpu)];
        return rank !== 0 ? rank : a.floor.total - b.floor.total;
      });
      cheapestEntry = noGpuFeasible[0];
    }
  }

  if (cheapestEntry.floor.total > budget) {
    const cheapestTotal = Math.round(cheapestEntry.floor.total);
    const shortfall = Math.round(cheapestEntry.floor.total - budget);
    return {
      canBuild: false,
      noBuildsReason: `The cheapest complete PC we can build from this store's inventory costs about ${cheapestTotal.toLocaleString()}, which is ${shortfall.toLocaleString()} more than your budget. Try increasing your budget, or ask the store to stock more affordable parts.`,
      builds: [],
    };
  }

  const budgetResult = ensurePsuSufficient(
    enforceBudgetCap(cheapestEntry.floor, catalogByCategory, budget),
    catalogByCategory,
    budget,
  );

  // Balanced and Max both climb from the same Budget-tier build (see
  // climbToward), upgrading the customer's highest-usecase-priority parts
  // first. Balanced stops at ~82% of budget; Max keeps climbing all the
  // way to the full budget. Because Max simply continues past where
  // Balanced stopped, Budget ≤ Balanced ≤ Max holds by construction, and
  // each tier naturally spends more on whatever the usecase weighs most
  // (e.g. GPU for Gaming, CPU/RAM for Coding).
  const balancedResult = ensurePsuSufficient(
    climbToward(budgetResult, catalogByCategory, budget, budget * 0.82, weights),
    catalogByCategory,
    budget,
  );

  const maxResult = ensurePsuSufficient(
    climbToward(budgetResult, catalogByCategory, budget, budget, weights),
    catalogByCategory,
    budget,
  );

  let builds = [budgetResult, balancedResult, maxResult];
  builds.sort((a, b) => a.total - b.total);

  const tierMeta = ["Budget Build", "Balanced Build", "Max Build"];
  const finalBuilds = builds.map((b, i) =>
    finalizeBuild(b, tierMeta[i], budget, purpose, purposeProfile),
  );

  return { canBuild: true, noBuildsReason: "", builds: finalBuilds };
}

// Simple In-Memory IP Rate Limiter (15 requests per hour per IP)
const ipRequests = new Map();
setInterval(() => ipRequests.clear(), 60 * 60 * 1000);

router.post("/recommend", async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
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

  const { budget, purpose, extras, storeId } = req.body;
  const safeExtras = (extras || "").trim().slice(0, 200);

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
    if (cachedRec) {
      const buildsToServe = Array.isArray(cachedRec.builds)
        ? cachedRec.builds
        : cachedRec.buildName
          ? [
              {
                ...cachedRec,
                tier: cachedRec.tier || "Recommended Build",
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
        currency,
        cached: true,
      });
    }

    const generated = generateBuildsFromCatalog(
      products,
      parsedBudget,
      purpose,
    );
    const payload = {
      success: true,
      builds: generated.builds,
      canBuild: generated.canBuild,
      noBuildsReason: generated.noBuildsReason,
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
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const currentRequests = ipRequests.get(ip) || 0;
  if (currentRequests >= 15) {
    return res.status(429).json({
      error: "Too many requests. Please try again later or contact the store.",
      customerMessage: true,
    });
  }
  ipRequests.set(ip, currentRequests + 1);

  const { storeId, budget, purpose, tier, orderMethod } = req.body;
  if (!storeId || !budget || !purpose || !tier) {
    return res
      .status(400)
      .json({ error: "storeId, budget, purpose and tier are required" });
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

    const generated = generateBuildsFromCatalog(products, parsedBudget, purpose);
    if (!generated.canBuild) {
      return res.status(400).json({
        error: "Could not recreate this build — the store's inventory may have changed.",
        customerMessage: true,
      });
    }

    const matched = generated.builds.find((b) => b.tier === tier);
    if (!matched) {
      return res
        .status(400)
        .json({ error: "Could not find that build tier.", customerMessage: true });
    }

    const method = orderMethod === "woo" ? "woo" : "whatsapp";
    const buildWithCurrency = { ...matched, currency: store.currency || "PKR" };
    const orderId = await orderRequestDB.create(storeId, buildWithCurrency, method);

    res.json({ success: true, orderId, build: buildWithCurrency });
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

module.exports = router;
module.exports.generateBuildsFromCatalog = generateBuildsFromCatalog;
