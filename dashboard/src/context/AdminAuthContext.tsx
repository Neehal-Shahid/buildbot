import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AUTH_EXPIRED_EVENT } from "../lib/api";
import { clearAdminSession, getAdminToken, setAdminToken } from "../lib/session";

interface AdminAuthApi {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthApi | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAdminToken());
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const login = (t: string) => {
    setAdminToken(t);
    setToken(t);
  };

  const logout = () => {
    clearAdminSession();
    setToken(null);
  };

  // See StoreAuthContext for why this is gated on the rejected token
  // matching this context's own current token.
  useEffect(() => {
    function onAuthExpired(e: Event) {
      const detail = (e as CustomEvent<{ token: string }>).detail;
      if (detail?.token && detail.token === tokenRef.current) {
        clearAdminSession();
        setToken(null);
      }
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthApi {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
