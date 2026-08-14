import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";
import { useInjectedCss } from "../lib/useInjectedCss";
import landingCss from "./landing.css?raw";

// This page previously styled itself with raw Tailwind utility classes
// while every other auth screen (login/signup/forgot-password, all inside
// LandingPage.tsx) uses landing.css's .page/.auth-wrap/.auth-box classes,
// injected only while that page is mounted (see useInjectedCss). Because
// this page never injected that CSS, none of those classes did anything
// here even where the markup used them — it visibly looked like a
// different, less-finished page in the middle of the same auth flow. Using
// the exact same injected stylesheet and markup pattern as the other auth
// pages guarantees pixel-identical styling instead of trying to
// hand-match it with a second, parallel set of Tailwind classes.

function AuthLogo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
      <div
        style={{
          width: 30,
          height: 30,
          background: "#4f46e5",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </div>
      <span style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>BuildVolt</span>
    </div>
  );
}

function PwdToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <span className="pwd-toggle" onClick={onToggle} role="button" tabIndex={0} aria-label="Toggle password visibility">
      {shown ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </span>
  );
}

function Alert({ msg, type }: { msg: string | null; type: "success" | "error" | null }) {
  if (!msg) return <div className="alert" />;
  return <div className={`alert alert-${type} show`}>{msg}</div>;
}

// Mirrors isStrongPassword() in server/routes/auth.js exactly — the
// lowercase check was missing here, so e.g. "PASSWORD1!" scored a full
// 4/4 "strong" on this meter despite the server rejecting it outright for
// having no lowercase letter.
function strengthScore(val: string) {
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[a-z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(val)) score++;
  return score;
}

const strengthColors = ["#e5e7eb", "#e74c3c", "#f39c12", "#f39c12", "#2ecc71", "#2ecc71"];

export default function ResetPasswordPage() {
  useInjectedCss(landingCss);

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
    // The strength meter above was purely cosmetic — it colored a bar but
    // never actually blocked a weak password from being submitted, so
    // this round-tripped to the server for a rejection instead of
    // failing immediately in-page.
    if (strengthScore(password) < 5) {
      setAlert({
        type: "error",
        msg: "Password needs 8+ characters, uppercase, lowercase, a number, and a special character.",
      });
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
    <div className="page active" id="page-reset-password">
      <div className="auth-wrap">
        <div className="auth-box">
          <AuthLogo />
          <h2>Set new password</h2>
          <p>Choose a strong password for your account.</p>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">New Password</label>
            <div className="pwd-wrap">
              <input
                id="reset-password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
              <PwdToggle shown={showPw} onToggle={() => setShowPw((s) => !s)} />
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "#e5e7eb", margin: "8px 0 5px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, transition: "all 0.3s", width: `${(score / 5) * 100}%`, background: strengthColors[score] }} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
              Uppercase, lowercase, number and special character required.
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-confirm">Confirm Password</label>
            <div className="pwd-wrap">
              <input
                id="reset-confirm"
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
              <PwdToggle shown={showConfirm} onToggle={() => setShowConfirm((s) => !s)} />
            </div>
          </div>

          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            onClick={doReset}
            disabled={loading}
          >
            {loading ? "Resetting…" : "Reset Password"}
          </button>

          <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />

          <div className="auth-switch">
            <a href="/" style={{ color: "#4f46e5", cursor: "pointer" }}>
              ← Back to sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
