import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { dashboardApi, WIDGET_DEFAULTS } from "../lib/dashboardApi";
import { ApiError, AUTH_EXPIRED_EVENT } from "../lib/api";
import {
  clearStoreSession,
  getStoreSession,
  getStoreToken,
  isStoreTokenExpired,
  setStoreSession,
  type StoreSession,
} from "../lib/session";

interface StoreAuthApi {
  token: string | null;
  store: StoreSession | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setSession: (token: string, store: StoreSession) => void;
  logout: () => void;
}

const StoreAuthContext = createContext<StoreAuthApi | null>(null);

// Mirrors the original dashboard.html's enterApp(): normalizes the raw
// /me store row (snake_case) into the camelCase shape the rest of the app
// already used in localStorage['bb_store'], and force-logs-out on any
// session error exactly like the original's catch block did.
function normalizeStore(raw: Record<string, unknown>): StoreSession {
  return {
    storeId: String(raw.store_id ?? ""),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    planStatus: String(raw.plan_status ?? ""),
    brandColor: String(raw.brand_color ?? ""),
    currency: String(raw.currency ?? ""),
    marketingEmailsEnabled: raw.marketing_emails_enabled !== 0,
    whatsappNumber: String(raw.whatsapp_number ?? ""),
    whatsappVerified: !!raw.whatsapp_verified,
    wooConnected: !!raw.woo_connected,
    // widget_enabled defaults to 1 server-side, so treat "column absent"
    // as enabled — same rule the backend uses (`widget_enabled !== 0`).
    widgetEnabled: raw.widget_enabled !== 0,
    widgetTitle: String(raw.widget_title || WIDGET_DEFAULTS.widgetTitle),
    welcomeMsg: String(raw.welcome_msg || WIDGET_DEFAULTS.welcomeMsg),
    buttonText: String(raw.button_text || WIDGET_DEFAULTS.buttonText),
    widgetBg: String(raw.widget_bg || WIDGET_DEFAULTS.widgetBg),
    widgetLastSeen: raw.widget_last_seen ? String(raw.widget_last_seen) : null,
    isGoogleAccount: !!raw.google_id,
    dataSource: (raw.data_source === "woo" || raw.data_source === "ospos" ? raw.data_source : "manual") as
      | "woo"
      | "ospos"
      | "manual",
    dataSourceConfirmed: !!raw.data_source_confirmed,
  };
}

export function StoreAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [store, setStore] = useState<StoreSession | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenRef = useRef(token);
  tokenRef.current = token;

  // A dead session (expired/revoked token) previously just left every tab
  // showing whatever "Invalid token" error its own API call happened to
  // hit, with no sign-out. apiFetch fires AUTH_EXPIRED_EVENT whenever an
  // authenticated request 401s; only act on it if the rejected token is
  // still this store's current one (an unrelated admin session 401ing in
  // the same browser must not log the store owner out).
  useEffect(() => {
    function onAuthExpired(e: Event) {
      const detail = (e as CustomEvent<{ token: string }>).detail;
      if (detail?.token && detail.token === tokenRef.current) {
        clearStoreSession();
        setToken(null);
        setStore(null);
      }
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  async function refresh() {
    if (isStoreTokenExpired()) clearStoreSession();
    const t = getStoreToken();
    if (!t) {
      setToken(null);
      setStore(null);
      setLoading(false);
      return;
    }
    try {
      const data = await dashboardApi.me(t);
      if (!data.success || !data.store) throw new Error("Session invalid");
      const normalized = normalizeStore(data.store as unknown as Record<string, unknown>);
      setStoreSession(t, normalized);
      setToken(t);
      setStore(normalized);
    } catch (err) {
      // Only a real rejection of the session (bad/expired token, deleted
      // store) should sign the owner out. A network blip or a 500 from
      // Railway used to clear localStorage and force a fresh login, which
      // is both alarming and unnecessary — fall back to the cached
      // session in that case and let the next refresh() try again.
      const sessionRejected =
        err instanceof ApiError && [401, 403, 404].includes(err.status);
      const cached = getStoreSession();
      if (sessionRejected || !cached) {
        clearStoreSession();
        setToken(null);
        setStore(null);
      } else {
        setToken(t);
        setStore(cached);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSession(t: string, s: StoreSession) {
    setStoreSession(t, s);
    setToken(t);
    setStore(s);
    // Login/signup/Google-auth responses only carry a handful of fields
    // (see server/routes/auth.js), not the full /me shape — isGoogleAccount
    // among them. Refresh right after so a store owner who just finished
    // signing in doesn't have to reload the page before fields like that
    // one are actually correct (see AccountTab.tsx).
    refresh();
  }

  function logout() {
    clearStoreSession();
    setToken(null);
    setStore(null);
  }

  return (
    <StoreAuthContext.Provider value={{ token, store, loading, refresh, setSession, logout }}>
      {children}
    </StoreAuthContext.Provider>
  );
}

export function useStoreAuth(): StoreAuthApi {
  const ctx = useContext(StoreAuthContext);
  if (!ctx) throw new Error("useStoreAuth must be used within StoreAuthProvider");
  return ctx;
}
