// Mirrors dashboard/config.js's API-selection logic exactly: production API
// by default (works on localhost too), local API only when explicitly opted
// into via ?localApi=1 or localStorage, so localhost never silently breaks
// auth against a local backend nobody started.
const useLocalApi =
  window.location.hostname === "localhost" &&
  (new URLSearchParams(window.location.search).get("localApi") === "1" ||
    localStorage.getItem("bb_use_local_api") === "1");

export const API_ORIGIN = useLocalApi
  ? "http://localhost:3001"
  : "https://buildbot-production-3f70.up.railway.app";

export const API_BASE = `${API_ORIGIN}/api`;

export const SUPPORT_EMAIL = "workwithneehal@gmail.com";

// Session TTL — must match server JWT expiry (7 days). Same constant/name
// as the old config.js (BB_TOKEN_TTL_MS) so nothing about session lifetime
// changes for already-logged-in users during cutover.
export const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getWidgetScriptUrl(storeId: string) {
  return `<script src="${API_ORIGIN}/widget.js" data-store-id="${storeId}"><\/script>`;
}
