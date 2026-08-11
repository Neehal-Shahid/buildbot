import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmOptions {
  title: string;
  desc?: string;
  okText?: string;
  cancelText?: string;
  variant?: "primary" | "danger";
  /** Optional extra form content rendered between desc and buttons
   * (replaces the old bodyHtml raw-string injection with real JSX/children,
   * e.g. the delete-account "type your store ID" confirmation input). */
  body?: ReactNode;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Replaces the original uiConfirm({title, desc, okText, cancelText, variant,
// bodyHtml}) => Promise<boolean> helper. Same call signature/shape (minus
// bodyHtml becoming a real `body` ReactNode instead of an HTML string) so
// call sites port over almost unchanged.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    setOpts(null);
    resolver.current?.(result);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => close(false)}>
        {opts && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold text-text">{opts.title}</h3>
              {opts.desc && (
                <p className="mt-1 text-sm text-muted">{opts.desc}</p>
              )}
            </div>
            {opts.body}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => close(false)}>
                {opts.cancelText ?? "Cancel"}
              </Button>
              <Button
                variant={opts.variant === "danger" ? "danger" : "primary"}
                onClick={() => close(true)}
              >
                {opts.okText ?? "Confirm"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
