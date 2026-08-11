import { useState } from "react";
import { adminApi } from "../../lib/adminApi";
import { ApiError } from "../../lib/api";
import { useAdminAuth } from "../../context/AdminAuthContext";

type View = "signin" | "forgot" | "reset";

const LOGO = (
  <div className="login-logo">
    <div className="login-logo-mark">
      <svg viewBox="0 0 24 24">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </div>
    <span className="login-logo-text">BuildVolt</span>
    <span className="login-logo-badge">Admin</span>
  </div>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function AdminLogin() {
  const resetToken = new URLSearchParams(window.location.search).get("reset_token");
  const [view, setView] = useState<View>(resetToken ? "reset" : "signin");
  const { login } = useAdminAuth();

  return (
    <div id="admin-login">
      <div className="login-wrap">
        {view === "signin" && <SignInBox onForgot={() => setView("forgot")} onLogin={login} />}
        {view === "forgot" && <ForgotBox onBack={() => setView("signin")} />}
        {view === "reset" && resetToken && <ResetBox token={resetToken} onDone={() => setView("signin")} />}
      </div>
    </div>
  );
}

function Alert({ msg, type }: { msg: string | null; type: "success" | "error" | null }) {
  if (!msg) return <div className="alert" />;
  return <div className={`alert alert-${type} show`}>{msg}</div>;
}

function SignInBox({ onForgot, onLogin }: { onForgot: () => void; onLogin: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function submit() {
    if (!email || !password) return setAlert({ msg: "Email and password required.", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.login(email, password);
      onLogin(data.token);
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Cannot connect to server.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-box" onKeyDown={(e) => e.key === "Enter" && submit()}>
      {LOGO}
      <h2>Admin Sign In</h2>
      <p>Restricted access. Authorised personnel only.</p>
      <div className="form-group" style={{ marginTop: 20 }}>
        <label className="form-label">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@buildvolt.pk" autoComplete="email" />
      </div>
      <div className="form-group">
        <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          Password
          <span
            onClick={onForgot}
            style={{ fontSize: 12, color: "var(--accent)", cursor: "pointer", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}
          >
            Forgot password?
          </span>
        </label>
        <div className="pwd-wrap">
          <input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            autoComplete="current-password"
            style={{ paddingRight: 38 }}
          />
          <span className="pwd-toggle" onClick={() => setShowPwd((s) => !s)}>
            <EyeIcon />
          </span>
        </div>
      </div>
      <button className="btn btn-primary btn-full" onClick={submit} disabled={busy}>
        Sign in to Admin Panel
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function ForgotBox({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function submit() {
    if (!email) return setAlert({ msg: "Email required.", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.forgotPassword(email);
      setAlert({ msg: data.message, type: "success" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Cannot connect to server.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-box" onKeyDown={(e) => e.key === "Enter" && submit()}>
      {LOGO}
      <h2>Reset Password</h2>
      <p>Enter your admin email and we'll send a reset link.</p>
      <div className="form-group" style={{ marginTop: 20 }}>
        <label className="form-label">Admin Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@buildvolt.pk" autoComplete="email" />
      </div>
      <button className="btn btn-primary btn-full" onClick={submit} disabled={busy}>
        Send Reset Link
      </button>
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <span onClick={onBack} style={{ fontSize: 13, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}>
          ← Back to sign in
        </span>
      </div>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function ResetBox({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function submit() {
    if (!password) return setAlert({ msg: "Please fill in the password.", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.resetPassword(token, password);
      if (data.success) {
        setAlert({ msg: "Password reset! Redirecting to sign in…", type: "success" });
        setTimeout(onDone, 1500);
      } else {
        setAlert({ msg: data.error || "Something went wrong.", type: "error" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Cannot connect to server.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-box" onKeyDown={(e) => e.key === "Enter" && submit()}>
      {LOGO}
      <h2>Set New Password</h2>
      <p>Enter your new admin password below.</p>
      <div className="form-group" style={{ marginTop: 20 }}>
        <label className="form-label">New Password</label>
        <div className="pwd-wrap">
          <input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, uppercase, number, symbol"
            style={{ paddingRight: 38 }}
          />
          <span className="pwd-toggle" onClick={() => setShowPwd((s) => !s)}>
            <EyeIcon />
          </span>
        </div>
      </div>
      <button className="btn btn-primary btn-full" onClick={submit} disabled={busy}>
        Update Password
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}
