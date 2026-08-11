import { useState } from "react";
import type { InputHTMLAttributes } from "react";

// Reusable password field w/ show/hide eye toggle — replaces the original
// togglePassword(inputId, iconEl) DOM-id pattern (which, notably, was
// referenced via onclick in dashboard.html but never defined there — a
// pre-existing dead-handler bug found during migration research; this
// component is the real, working implementation used everywhere now).
export function PasswordInput({
  className = "",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className={`w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 pr-10 text-[13.5px] text-text outline-none transition-colors focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)] ${className}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dim hover:text-muted"
        aria-label="Toggle password visibility"
        tabIndex={-1}
      >
        {show ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
