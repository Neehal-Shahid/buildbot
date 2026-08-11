import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { dashboardApi } from "../lib/dashboardApi";
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
  };
}

export function StoreAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [store, setStore] = useState<StoreSession | null>(null);
  const [loading, setLoading] = useState(true);

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
    } catch {
      clearStoreSession();
      setToken(null);
      setStore(null);
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

// Falls back to the cached session (from localStorage, already read once
// at bootstrap) if the initial /me hasn't resolved yet, so the very first
// render after a hard refresh doesn't flash a logged-out state — same
// intent as the original's `currentStore = readStoreFromStorage()` at
// script top-level, before enterApp() ever runs.
export function initialStoreFromStorage(): StoreSession | null {
  return getStoreSession();
}
