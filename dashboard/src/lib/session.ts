import { TOKEN_TTL_MS } from "./config";

// Store-owner session (dashboard.html). Same localStorage key names as the
// original vanilla app (bb_token / bb_store / bb_token_expires) so a user
// already logged in during cutover isn't silently signed out.
export interface StoreSession {
  storeId: string;
  name: string;
  email: string;
  planStatus?: string;
  brandColor?: string;
  currency?: string;
  marketingEmailsEnabled?: boolean;
  whatsappNumber?: string;
  whatsappVerified?: boolean;
  wooConnected?: boolean;
  /** stores.widget_enabled — whether the widget actually renders on the
   *  storefront. Distinct from "has an order method configured". */
  widgetEnabled?: boolean;
  // Widget copy lives on the stores row too (see widgetDB.getSettings in
  // server/database.js), so /me already returns it — no second fetch needed.
  widgetTitle?: string;
  welcomeMsg?: string;
  buttonText?: string;
  widgetBg?: string;
  // Timestamp of the last time the public /store-config/:storeId endpoint
  // was hit for this store — that endpoint is only ever called by a real,
  // embedded widget.js, so a non-null value is real evidence the install
  // snippet is actually live on the store's site (not just "the owner has
  // some way to take orders", which used to be treated as "installed").
  // See DashboardApp.tsx's Install Widget step.
  widgetLastSeen?: string | null;
  // True for accounts created via "Sign in with Google" — they DO have a
  // password row in the DB (a random one, generated server-side so the
  // schema's NOT NULL constraint is satisfied), but the owner never chose
  // or knows it, so "enter your current password to change it" is
  // impossible for them to complete. See AccountTab.tsx.
  isGoogleAccount?: boolean;
  // Where this store's widget actually gets its product data from —
  // deliberately separate from wooConnected (which just means the
  // WordPress plugin is authenticated, and stays true regardless of data
  // source, since it's also what delivers the widget). See ProductsTab.tsx.
  dataSource?: "woo" | "manual";
  // False until the store owner has actually gone through the Products
  // tab's "choose a data source" step — dataSource defaults to 'manual'
  // server-side, but that default must never be shown as if it were an
  // explicit choice nobody has made yet.
  dataSourceConfirmed?: boolean;
  [key: string]: unknown;
}

export function getStoreToken(): string | null {
  return localStorage.getItem("bb_token");
}

export function getStoreSession(): StoreSession | null {
  const raw = localStorage.getItem("bb_store");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoreSession;
  } catch {
    return null;
  }
}

export function setStoreSession(token: string, store?: StoreSession) {
  localStorage.setItem("bb_token", token);
  if (store) localStorage.setItem("bb_store", JSON.stringify(store));
  localStorage.setItem("bb_token_expires", String(Date.now() + TOKEN_TTL_MS));
}

export function refreshStoreTokenExpiry() {
  localStorage.setItem("bb_token_expires", String(Date.now() + TOKEN_TTL_MS));
}

export function isStoreTokenExpired(): boolean {
  const expires = localStorage.getItem("bb_token_expires");
  if (!expires) return false;
  return Date.now() > Number(expires);
}

export function clearStoreSession() {
  localStorage.removeItem("bb_token");
  localStorage.removeItem("bb_store");
  localStorage.removeItem("bb_token_expires");
}

// Admin session (admin.html) — deliberately a separate localStorage
// namespace (bb_admin_token) from the store session, matching the
// original app, so an admin and a store owner can be logged in on the
// same browser at once without colliding.
export function getAdminToken(): string | null {
  return localStorage.getItem("bb_admin_token");
}

export function setAdminToken(token: string) {
  localStorage.setItem("bb_admin_token", token);
}

export function clearAdminSession() {
  localStorage.removeItem("bb_admin_token");
}
