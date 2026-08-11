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
