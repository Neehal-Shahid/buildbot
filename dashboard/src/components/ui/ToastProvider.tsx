import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastApi {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Replaces the original showToast()/#toast-wrap DOM-append pattern with a
// React context so any component can call useToast() instead of reaching
// for a global function and a hardcoded container id.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = ++idRef.current;
      setToasts((t) => [...t, { id, type, title, message }]);
      // Errors stay a bit longer (6s) than success/info (3.5s), matching
      // the original showToast() duration split.
      setTimeout(() => remove(id), type === "error" ? 6000 : 3500);
    },
    [remove],
  );

  const api: ToastApi = {
    success: (title, message) => push("success", title, message),
    error: (title, message) => push("error", title, message),
    info: (title, message) => push("info", title, message),
  };

  // Fixed, explicit colors rather than the design-token classes
  // (bg-surface/text-success/etc.) — this provider is mounted once at the
  // app root and toasts can fire from any page, but --surface/--success/
  // --danger are redeclared with different (dark-theme) values by
  // landing.css's :root block. A component with no single page context
  // needs colors that are correct everywhere, not colors that happen to
  // match whichever page's stylesheet is currently injected.
  const palette: Record<ToastType, { bg: string; ring: string; icon: string }> = {
    success: { bg: "#ecfdf5", ring: "#a7f3d0", icon: "#059669" },
    error: { bg: "#fef2f2", ring: "#fecaca", icon: "#dc2626" },
    info: { bg: "#eff6ff", ring: "#bfdbfe", icon: "#2563eb" },
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[999999] flex flex-col gap-2.5 w-[22rem] max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 rounded-xl bg-white px-4 py-3.5 shadow-lg"
            style={{ boxShadow: "0 8px 24px rgba(15,23,42,0.12), 0 1px 2px rgba(15,23,42,0.08)" }}
          >
            <div
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
              style={{ background: palette[t.type].bg, border: `1px solid ${palette[t.type].ring}` }}
            >
              <ToastIcon type={t.type} color={palette[t.type].icon} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="text-[13px] font-semibold leading-snug text-neutral-900">{t.title}</div>
              {t.message && <div className="mt-0.5 text-[12px] leading-snug text-neutral-500">{t.message}</div>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="flex-none rounded-md p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Dismiss"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastIcon({ type, color }: { type: ToastType; color: string }) {
  if (type === "success") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
