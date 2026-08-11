import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { clearAdminSession, getAdminToken, setAdminToken } from "../lib/session";

interface AdminAuthApi {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthApi | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getAdminToken());

  const login = (t: string) => {
    setAdminToken(t);
    setToken(t);
  };

  const logout = () => {
    clearAdminSession();
    setToken(null);
  };

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
