// Shared between StoreSyncTab (where the choice is made) and EmbedTab
// (where it decides which install guide to show) — kept in one place so
// the two tabs can never drift on the storage key or the default.
export type WebsiteMode = "custom" | "woo";

// Scoped per store, not one global key: this browser may have been used to
// test more than one BuildVolt account (or will be, on a shared machine),
// and a brand-new store must never inherit a previous account's leftover
// choice — that showed up as Step 1 (Store & sync) already ticked "done"
// for an account that had just been created and had chosen nothing yet.
function key(storeId: string): string {
  return `bb_store_mode_${storeId}`;
}

export function getStoredMode(storeId: string): WebsiteMode {
  return localStorage.getItem(key(storeId)) === "woo" ? "woo" : "custom";
}

// Distinguishes "the store owner has explicitly chosen a website type"
// from "nothing chosen yet, currently defaulting to custom" — used to
// mark Store & Sync's step as done only once an actual choice is made,
// not just because "custom" happens to be the fallback.
export function hasChosenMode(storeId: string | undefined): boolean {
  return !!storeId && localStorage.getItem(key(storeId)) !== null;
}

export function setStoredMode(storeId: string, mode: WebsiteMode): void {
  localStorage.setItem(key(storeId), mode);
}
