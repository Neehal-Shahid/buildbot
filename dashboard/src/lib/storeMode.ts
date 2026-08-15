// Shared between StoreSyncTab (where the choice is made) and EmbedTab
// (where it decides which install guide to show) — kept in one place so
// the two tabs can never drift on the storage key or the default.
export type WebsiteMode = "custom" | "woo";

export type DataSource = "woo" | "manual";

// Which data sources make sense for each website type chosen in Store &
// Sync (Step 1). A custom (non-WordPress) site has no WooCommerce product
// listing to ever sync from, so that option is excluded there — it can
// only use the Dashboard. A WordPress site can still validly use the
// Dashboard instead of WooCommerce: the widget always gets its data from
// BuildVolt's own catalog regardless of install method, so nothing about
// being on WordPress requires WooCommerce specifically to be the source.
// Shared with DashboardApp.tsx (which uses it to decide whether the
// Products/Install Widget steps can honestly show as done) so the two can
// never drift on which sources are valid.
export const ALLOWED_SOURCES: Record<WebsiteMode, DataSource[]> = {
  custom: ["manual"],
  woo: ["woo", "manual"],
};

// True once a data source has been confirmed but no longer fits the
// current website type (e.g. website type was switched from WordPress to
// Custom after WooCommerce was already chosen as the source) — in this
// state the widget can't actually be trusted to serve real products even
// if it was working before, until the store owner re-picks a source.
export function isSourceMismatched(
  storeId: string,
  dataSource: DataSource,
  dataSourceConfirmed: boolean,
): boolean {
  if (!dataSourceConfirmed) return false;
  return !ALLOWED_SOURCES[getStoredMode(storeId)].includes(dataSource);
}

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
