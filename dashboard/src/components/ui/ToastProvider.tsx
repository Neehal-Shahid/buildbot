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
  const typeClass: Record<ToastType, string> = {
    success: "border-emerald-600 text-emerald-700",
    error: "border-red-600 text-red-700",
    info: "border-sky-600 text-sky-700",
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[999999] flex flex-col gap-2 w-80 max-w-[90vw]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg border bg-white px-4 py-3 shadow-md flex items-start justify-between gap-2 ${typeClass[t.type]}`}
          >
            <div>
              <div className="text-sm font-semibold text-neutral-900">{t.title}</div>
              {t.message && <div className="text-xs mt-0.5">{t.message}</div>}
            </div>
            <button
              onClick={() => remove(t.id)}
              className="text-xs opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
