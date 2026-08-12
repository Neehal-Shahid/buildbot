// Shared between StoreSyncTab (where the choice is made) and EmbedTab
// (where it decides which install guide to show) — kept in one place so
// the two tabs can never drift on the storage key or the default.
export type WebsiteMode = "custom" | "woo";

const KEY = "bb_store_mode";

export function getStoredMode(): WebsiteMode {
  return localStorage.getItem(KEY) === "woo" ? "woo" : "custom";
}

// Distinguishes "the store owner has explicitly chosen a website type"
// from "nothing chosen yet, currently defaulting to custom" — used to
// mark Store & Sync's step as done only once an actual choice is made,
// not just because "custom" happens to be the fallback.
export function hasChosenMode(): boolean {
  return localStorage.getItem(KEY) !== null;
}

export function setStoredMode(mode: WebsiteMode): void {
  localStorage.setItem(KEY, mode);
}
