// ─── Canonical product categories ──────────────────────────
// The only categories the recommendation engine understands. Every
// upload/add/edit path routes raw store-owner text through
// normalizeCategory() so the database only ever holds these exact values.
const CANONICAL_CATEGORIES = [
  "CPU",
  "Motherboard",
  "RAM",
  "Storage",
  "GPU",
  "PSU",
  "Case",
  "CPU Cooler",
  "Case Fans",
];
const CANONICAL_SET = new Set(CANONICAL_CATEGORIES);

// Keyword rules, checked in priority order — most specific/least ambiguous
// first — so overlapping brand and model text resolves to the right
// category. Two ordering rules matter a lot here:
//  - "CPU Cooler" must be checked before the generic "cpu" rule, or a
//    product literally named "CPU Cooler" would get claimed by plain CPU.
//  - "Cooler Master" (a brand that also makes PSUs and cases, not just
//    coolers) must not fall into "CPU Cooler" just because it contains
//    the word "cooler" — same idea for other multi-category brand names.
function detectCategory(rawText) {
  const text = String(rawText || "").toLowerCase();
  if (!text) return null;

  if (
    text.includes("cpu cooler") ||
    text.includes("heatsink") ||
    text.includes("heat sink") ||
    text.includes("aio cooler") ||
    text.includes("liquid cooler") ||
    text.includes("air cooler") ||
    text.includes("hyper 212") ||
    text.includes("arctic freezer") ||
    text.includes("noctua") ||
    (text.includes("cooler") && !text.includes("cooler master"))
  )
    return "CPU Cooler";

  if (
    text.includes("power supply") ||
    text.includes("psu") ||
    text.includes("smps") ||
    text.includes("power unit") ||
    text.includes("seasonic") ||
    text.includes("cooler master mwe") ||
    text.includes("corsair cv") ||
    text.includes("corsair rm")
  )
    return "PSU";

  if (
    text.includes("graphics") ||
    text.includes("gpu") ||
    text.includes("video card") ||
    text.includes("graphic card") ||
    text.includes("vga") ||
    text.includes("rtx") ||
    text.includes("gtx") ||
    text.includes("radeon") ||
    text.includes("geforce") ||
    text.includes("nvidia")
  )
    return "GPU";

  if (
    text.includes("processor") ||
    text.includes("intel core") ||
    text.includes("ryzen") ||
    text.includes("threadripper") ||
    text.includes("xeon") ||
    text.includes("celeron") ||
    text.includes("pentium") ||
    text.includes("core i3") ||
    text.includes("core i5") ||
    text.includes("core i7") ||
    text.includes("core i9") ||
    text.includes("cpu")
  )
    return "CPU";

  if (
    text.includes("motherboard") ||
    text.includes("mainboard") ||
    text.includes("mobo")
  )
    return "Motherboard";

  if (
    text.includes("memory") ||
    text.includes("ram") ||
    text.includes("dimm") ||
    text.includes("vengeance") ||
    text.includes("ripjaws")
  )
    return "RAM";

  if (
    text.includes("storage") ||
    text.includes("ssd") ||
    text.includes("hdd") ||
    text.includes("nvme") ||
    text.includes("hard disk") ||
    text.includes("hard drive") ||
    text.includes("solid state") ||
    text.includes("m.2") ||
    text.includes("sata")
  )
    return "Storage";

  // Case Fans must be checked before the generic "Case" rule below.
  if (
    text.includes("case fan") ||
    text.includes("cooling fan") ||
    text.includes("fan")
  )
    return "Case Fans";

  if (
    text.includes("case") ||
    text.includes("chassis") ||
    text.includes("cabinet") ||
    text.includes("casing") ||
    text.includes("tower")
  )
    return "Case";

  return null;
}

// Tries the category field first, then falls back to the product name —
// covers files where the category column is missing, blank, or garbled
// (common in freeform PDF/Word uploads) but the product name still gives
// away what it is (e.g. name "RTX 3060 Graphics Card" with no category).
function normalizeCategory(categoryText, nameText) {
  return detectCategory(categoryText) || detectCategory(nameText) || null;
}

module.exports = { CANONICAL_CATEGORIES, CANONICAL_SET, normalizeCategory };
