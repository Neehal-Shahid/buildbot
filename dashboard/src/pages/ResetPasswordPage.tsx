import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";
import { BrandLogo } from "../components/BrandLogo";
import { Button } from "../components/ui/Button";
import { InlineAlert } from "../components/ui/InlineAlert";

const EyeIcon = ({ off }: { off: boolean }) =>
  off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

function strengthScore(val: string) {
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(val)) score++;
  return score;
}

const strengthColors = ["#e4e7ed", "#dc2626", "#d97706", "#d97706", "#059669"];

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function doReset() {
    if (!password || !confirm) {
      setAlert({ type: "error", msg: "Please fill in both fields." });
      return;
    }
    if (password !== confirm) {
      setAlert({ type: "error", msg: "Passwords do not match." });
      return;
    }
    if (!token) {
      setAlert({ type: "error", msg: "Invalid or missing reset link." });
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch<{ success?: boolean; error?: string }>(
        "/reset-password",
        { method: "POST", body: { token, password } },
      );
      if (data.success) {
        setAlert({ type: "success", msg: "Password reset successfully. Redirecting to login…" });
        setTimeout(() => {
          window.location.href = "/";
        }, 2500);
        return; // keep button disabled through the redirect
      }
      setAlert({ type: "error", msg: data.error || "Something went wrong." });
    } catch (err) {
      setAlert({
        type: "error",
        msg: err instanceof ApiError ? err.message : "Cannot connect to server. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") doReset();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password, confirm, token]);

  const score = strengthScore(password);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-5 py-6">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-9 shadow-sm">
        <div className="mb-6">
          <BrandLogo />
        </div>

        <h2 className="mb-1 text-xl font-bold tracking-tight text-text">
          Set new password
        </h2>
        <p className="mb-6 text-[13px] leading-relaxed text-muted">
          Choose a strong password for your account.
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
            New Password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              autoComplete="new-password"
              className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 pr-10 text-[13.5px] text-text outline-none transition-colors focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dim hover:text-muted"
              aria-label="Toggle password visibility"
            >
              <EyeIcon off={showPw} />
            </button>
          </div>
          <div className="mt-2 mb-1 h-[3px] overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(score / 4) * 100}%`,
                background: strengthColors[score],
              }}
            />
          </div>
          <div className="text-[11px] leading-relaxed text-dim">
            Uppercase, lowercase, number and special character required.
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 pr-10 text-[13.5px] text-text outline-none transition-colors focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-dim hover:text-muted"
              aria-label="Toggle password visibility"
            >
              <EyeIcon off={showConfirm} />
            </button>
          </div>
        </div>

        <Button
          onClick={doReset}
          loading={loading}
          className="mt-2 w-full"
        >
          Reset Password
        </Button>

        {alert && (
          <div className="mt-3.5">
            <InlineAlert type={alert.type} message={alert.msg} />
          </div>
        )}
      </div>
    </div>
  );
}
