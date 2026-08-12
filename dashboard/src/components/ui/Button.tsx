import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
}

// Replaces the original setBtnLoading()/manual disabled+textContent-swap
// pattern that was duplicated (and applied inconsistently) across both
// dashboard.html and admin.html — one `loading` prop covers every button.
export function Button({
  loading,
  variant = "primary",
  disabled,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  // Fixed Tailwind palette colors rather than the design-token classes
  // (bg-accent/text-text/border-border/bg-danger) — those resolve through
  // CSS variables that each page's own stylesheet redeclares differently
  // (landing.css sets a dark theme on :root), so a shared, reusable
  // component like this needs colors that stay correct regardless of
  // which page it ends up rendering inside, not colors tied to whichever
  // page's stylesheet happens to be active. indigo-600/700 and red-600
  // are the same hex values as the app's --accent/--accent-hover/--danger
  // tokens, so this looks identical wherever it's already used today.
  const variantClass = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "bg-neutral-100 text-neutral-900 border border-neutral-200 hover:bg-neutral-200",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100",
  }[variant];

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${variantClass} ${className}`}
      {...rest}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}
