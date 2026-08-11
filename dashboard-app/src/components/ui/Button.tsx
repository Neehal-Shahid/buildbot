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
  const variantClass = {
    primary: "bg-accent text-white hover:bg-accent-hover",
    secondary: "bg-surface-2 text-text border border-border hover:bg-surface-3",
    danger: "bg-danger text-white hover:brightness-90",
    ghost: "bg-transparent text-text-2 hover:bg-surface-2",
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
