import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../lib/authApi";
import { ApiError } from "../lib/api";
import {
  clearStoreSession,
  getStoreSession,
  getStoreToken,
  isStoreTokenExpired,
  setStoreSession,
  type StoreSession,
} from "../lib/session";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { useInjectedCss } from "../lib/useInjectedCss";
import landingCss from "./landing.css?raw";

type View = "landing" | "login" | "signup" | "forgot" | "verify-pending";

// Real URLs for the auth sub-views (see matching routes in App.tsx) so the
// browser back/forward buttons and refresh behave normally instead of
// everything living silently under "/".
const VIEW_PATHS: Record<View, string> = {
  landing: "/",
  login: "/login",
  signup: "/signup",
  forgot: "/forgot-password",
  "verify-pending": "/verify-email",
};
const PATH_TO_VIEW: Record<string, View> = {
  "/login": "login",
  "/signup": "signup",
  "/forgot-password": "forgot",
  "/verify-email": "verify-pending",
};

// This page is a 1:1 port of the original dashboard/index.html — same CSS
// (imported verbatim as landing.css) and same markup/class structure, so
// the JS logic below just swaps out the vanilla DOM manipulation for React
// state while keeping pixel-identical output.
export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const forceDashboard = new URLSearchParams(location.search).get("dashboard") === "1";

  const [view, setView] = useState<View>(() => {
    const initial = forceDashboard ? "login" : PATH_TO_VIEW[location.pathname] ?? "landing";
    return initial === "verify-pending" ? "login" : initial;
  });
  const [loggedIn, setLoggedIn] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [loginAlert, setLoginAlert] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useInjectedCss(landingCss);

  useEffect(() => {
    document.body.classList.toggle("landing-mode", view === "landing");
    document.body.classList.toggle(
      "auth-locked",
      view === "signup" || view === "login" || view === "forgot" || view === "verify-pending",
    );
  }, [view]);

  useEffect(() => {
    document.body.classList.toggle("nav-open", mobileNavOpen);
  }, [mobileNavOpen]);

  // Keeps `view` in sync with the URL for browser back/forward navigation
  // and direct links (e.g. someone opening /signup straight from a bookmark).
  // Navigations we trigger ourselves (via showPage -> navigate) just cause
  // this to re-set the same value, which is a harmless no-op.
  useEffect(() => {
    const target = forceDashboard ? "login" : PATH_TO_VIEW[location.pathname] ?? "landing";
    // /verify-email only makes sense once we actually know which email is
    // pending (set via signup/login) — a cold direct visit has nothing to
    // show, so send it to login instead of a blank "check your email" box.
    setView(target === "verify-pending" && !pendingEmail ? "login" : target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, forceDashboard, pendingEmail]);

  useEffect(() => {
    async function boot() {
      if (isStoreTokenExpired()) clearStoreSession();
      const token = getStoreToken();
      const store = getStoreSession();

      if (token && store) {
        setLoggedIn(true);
        try {
          const data = await authApi.me(token);
          if (data.success) {
            setLoggedIn(true);
            if (forceDashboard) navigate("/dashboard.html");
          } else if (data.requiresVerification) {
            clearStoreSession();
            setLoggedIn(false);
            setPendingEmail(store.email || "");
            setView("verify-pending");
            navigate(VIEW_PATHS["verify-pending"], { replace: true });
          } else {
            clearStoreSession();
            setLoggedIn(false);
            const fallback: View = forceDashboard ? "login" : "landing";
            setView(fallback);
            navigate(VIEW_PATHS[fallback], { replace: true });
          }
        } catch {
          if (forceDashboard) navigate("/dashboard.html");
        }
      } else {
        const verifyParam = new URLSearchParams(window.location.search).get("verify");
        if (verifyParam === "required") {
          setView("login");
          setLoginAlert("Please verify your email before accessing the dashboard.");
          navigate(VIEW_PATHS.login, { replace: true });
        } else if (forceDashboard) {
          setView("login");
        }
        // Otherwise leave `view` exactly as already derived from the URL
        // (landing, or a directly-visited /login, /signup, etc.) — no reset.
      }
      setChecked(true);
    }
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showPage(name: View) {
    setMobileNavOpen(false);
    const target: View = forceDashboard && name === "landing" ? "login" : name;
    setView(target);
    if (location.pathname !== VIEW_PATHS[target]) navigate(VIEW_PATHS[target]);
  }

  function scrollToLandingSection(id: string) {
    if (view !== "landing") showPage("landing");
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function goHome() {
    if (view !== "landing") showPage("landing");
    else setMobileNavOpen(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function onAuthed(token: string, store: StoreSession) {
    setStoreSession(token, store);
    setLoggedIn(true);
    navigate("/dashboard.html");
  }

  function doLogout() {
    clearStoreSession();
    setLoggedIn(false);
    showPage("landing");
  }

  if (!checked) return null;

  return (
    <>
      <div className="nav-overlay" style={mobileNavOpen ? { display: "block", opacity: 1 } : undefined} onClick={() => setMobileNavOpen(false)} />
      {view === "landing" && (
        <nav id="main-nav">
          <div className="nav-logo" onClick={goHome}>
            ⚡ BuildVolt
          </div>
          <button
            type="button"
            className="nav-menu-btn"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className={`nav-links${mobileNavOpen ? " open" : ""}`}>
            <div className="nav-link" onClick={goHome}>
              Home
            </div>
            <div className="nav-link" onClick={() => scrollToLandingSection("how-it-works")}>
              Features
            </div>
            {loggedIn && (
              <div className="nav-link" style={{ opacity: 0.7, fontSize: 13 }} onClick={doLogout}>
                Sign Out
              </div>
            )}
            {loggedIn && (
              <div className="nav-link btn-primary btn" onClick={() => navigate("/dashboard.html")}>
                Go to Dashboard
              </div>
            )}
            {!loggedIn && (
              <div className="nav-link" onClick={() => showPage("login")}>
                Login
              </div>
            )}
            {!loggedIn && (
              <div className="nav-link btn-primary btn" onClick={() => showPage("signup")}>
                Get Started Free
              </div>
            )}
          </div>
        </nav>
      )}

      {view === "landing" && <LandingSections onShowPage={showPage} onScrollTo={scrollToLandingSection} />}

      {view === "signup" && (
        <SignupPage
          onBack={() => showPage("landing")}
          onLogin={() => showPage("login")}
          onAuthed={onAuthed}
          onNeedsVerify={(email, password) => {
            setPendingEmail(email);
            setPendingPassword(password);
            showPage("verify-pending");
          }}
        />
      )}

      {view === "verify-pending" && (
        <VerifyPendingPage
          email={pendingEmail}
          password={pendingPassword}
          onBack={() => showPage("landing")}
          onSignupAgain={() => showPage("signup")}
          onLogin={() => showPage("login")}
        />
      )}

      {view === "login" && (
        <LoginPage
          initialAlert={loginAlert}
          onBack={() => showPage("landing")}
          onForgot={() => showPage("forgot")}
          onSignup={() => showPage("signup")}
          onAuthed={onAuthed}
          onNeedsVerify={(email, password) => {
            setPendingEmail(email);
            setPendingPassword(password);
            showPage("verify-pending");
          }}
        />
      )}

      {view === "forgot" && <ForgotPage onBack={() => showPage("login")} />}
    </>
  );
}

// ─── LOGO (shared across auth boxes) ───────────────────────
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
      <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: "-0.3px" }}>BuildVolt</span>
    </div>
  );
}

function AuthBack({ onClick, label = "Back to home" }: { onClick: () => void; label?: string }) {
  return (
    <div className="auth-back" onClick={onClick}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label}
    </div>
  );
}

function PwdToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <span className="pwd-toggle" onClick={onToggle}>
      {shown ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
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

// ─── SIGNUP ─────────────────────────────────────────────────
function SignupPage({
  onBack,
  onLogin,
  onAuthed,
  onNeedsVerify,
}: {
  onBack: () => void;
  onLogin: () => void;
  onAuthed: (token: string, store: StoreSession) => void;
  onNeedsVerify: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const score = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[a-z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) s++;
    return s;
  })();
  const strengthColors = ["#e74c3c", "#e74c3c", "#f39c12", "#f39c12", "#2ecc71", "#2ecc71"];

  async function submit() {
    if (!email || !password) return setAlert({ msg: "Please fill all fields.", type: "error" });
    setBusy(true);
    try {
      const data = await authApi.signup(email, password);
      if (data.success && data.requiresVerification) {
        onNeedsVerify(data.email || email, password);
      } else if (data.success) {
        setAlert({ msg: data.message || "Account created.", type: "success" });
      } else {
        setAlert({ msg: data.error || "Signup failed.", type: "error" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Cannot connect to server.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle(credential: string) {
    setBusy(true);
    try {
      const data = await authApi.googleAuth(credential);
      if (data.success && data.token && data.store) {
        setAlert({ msg: "✅ Welcome! Redirecting...", type: "success" });
        setTimeout(() => onAuthed(data.token!, data.store!), 800);
      } else {
        setAlert({ msg: data.error || "Google Login failed.", type: "error" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Connection error.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page active" id="page-signup" onKeyDown={(e) => e.key === "Enter" && submit()}>
      <AuthBack onClick={onBack} />
      <div className="auth-wrap">
        <div className="auth-box">
          <AuthLogo />
          <h2>Create your account</h2>
          <p id="auth-trial-note">Free to use. No credit card needed.</p>

          <GoogleSignInButton context="signup" onCredential={onGoogle} />
          <div className="divider">or continue with email</div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email Address</label>
            <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourstore.com" autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <div className="pwd-wrap">
              <input
                id="signup-password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
              <PwdToggle shown={showPwd} onToggle={() => setShowPwd((s) => !s)} />
            </div>
            <div style={{ height: 3, borderRadius: 2, background: "#e5e7eb", margin: "8px 0 5px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, transition: "all 0.3s", width: `${(score / 5) * 100}%`, background: strengthColors[score] }} />
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
              Use uppercase, lowercase, number and special character.
            </div>
          </div>

          <button className="btn btn-primary btn-full" style={{ marginTop: 4, opacity: busy ? 0.7 : 1, cursor: busy ? "not-allowed" : "pointer" }} onClick={submit} disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>

          <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />

          <div className="auth-switch">
            Already have an account? <a onClick={onLogin}>Sign in</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── VERIFY PENDING ─────────────────────────────────────────
function VerifyPendingPage({
  email,
  password,
  onBack,
  onSignupAgain,
  onLogin,
}: {
  email: string;
  password: string;
  onBack: () => void;
  onSignupAgain: () => void;
  onLogin: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function verify() {
    if (!code || code.length !== 6)
      return setAlert({ msg: "Please enter the 6-digit code from your email.", type: "error" });
    setBusy(true);
    try {
      const data = await authApi.verifyEmailOtp(email, code);
      if (data.success) {
        setAlert({ msg: "✅ Email verified! Redirecting to sign in…", type: "success" });
        setTimeout(onLogin, 1200);
      } else {
        setAlert({ msg: data.error || "Verification failed.", type: "error" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Cannot connect to server.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!email || !password) return onLogin();
    setResending(true);
    try {
      const data = await authApi.resendVerification(email, password);
      setAlert({ msg: data.message || data.error || "Could not resend email.", type: data.success ? "success" : "error" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Cannot connect to server.", type: "error" });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="page active" id="page-verify-pending" onKeyDown={(e) => e.key === "Enter" && verify()}>
      <AuthBack onClick={onBack} />
      <div className="auth-wrap">
        <div className="auth-box">
          <AuthLogo />
          <div className="auth-status-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2>Check your email</h2>
          <p>
            We sent a verification link and a 6-digit code to{" "}
            <span className="verify-email-highlight">{email}</span>. Use either method to activate your account.
          </p>

          <div className="form-group" style={{ marginTop: 8 }}>
            <label className="form-label" htmlFor="verify-code">Verification code</label>
            <input
              id="verify-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              inputMode="numeric"
              autoComplete="one-time-code"
              style={{ letterSpacing: "0.2em", textAlign: "center", fontSize: 18, fontWeight: 600 }}
            />
          </div>

          <button
            className="btn btn-primary btn-full"
            style={{ marginBottom: 10, opacity: busy ? 0.7 : 1, cursor: busy ? "not-allowed" : "pointer" }}
            onClick={verify}
            disabled={busy}
          >
            {busy ? "Verifying…" : "Verify with code"}
          </button>

          <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />

          <button
            className="btn btn-primary btn-full"
            style={{
              background: "#fff",
              color: "#4f46e5",
              border: "1.5px solid #e5e7eb",
              boxShadow: "none",
              opacity: resending ? 0.7 : 1,
              cursor: resending ? "not-allowed" : "pointer",
            }}
            onClick={resend}
            disabled={resending}
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>

          <div className="auth-switch">
            Wrong email? <a onClick={onSignupAgain}>Sign up again</a> · <a onClick={onLogin}>Sign in</a>
          </div>
          <div className="auth-switch" style={{ marginTop: 10, fontSize: 12 }}>
            Need help? <a href="mailto:workwithneehal@gmail.com">Contact support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ──────────────────────────────────────────────────
function LoginPage({
  initialAlert,
  onBack,
  onForgot,
  onSignup,
  onAuthed,
  onNeedsVerify,
}: {
  initialAlert: string | null;
  onBack: () => void;
  onForgot: () => void;
  onSignup: () => void;
  onAuthed: (token: string, store: StoreSession) => void;
  onNeedsVerify: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(
    initialAlert ? { msg: initialAlert, type: "error" } : null,
  );

  async function submit() {
    if (!email || !password) return setAlert({ msg: "Please fill all fields.", type: "error" });
    setBusy(true);
    try {
      const data = await authApi.login(email, password);
      if (data.success && data.token && data.store) {
        onAuthed(data.token, data.store);
      } else if (data.requiresVerification) {
        onNeedsVerify(email, password);
      } else {
        setAlert({ msg: data.error || "Login failed.", type: "error" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Cannot connect to server.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle(credential: string) {
    setBusy(true);
    try {
      const data = await authApi.googleAuth(credential);
      if (data.success && data.token && data.store) {
        setAlert({ msg: "✅ Login successful!", type: "success" });
        setTimeout(() => onAuthed(data.token!, data.store!), 800);
      } else {
        setAlert({ msg: data.error || "Google Login failed.", type: "error" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Connection error.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page active" id="page-login" onKeyDown={(e) => e.key === "Enter" && submit()}>
      <AuthBack onClick={onBack} />
      <div className="auth-wrap">
        <div className="auth-box">
          <AuthLogo />
          <h2>Welcome back</h2>
          <p>Sign in to your store dashboard.</p>

          <GoogleSignInButton context="signin" onCredential={onGoogle} />
          <div className="divider">or continue with email</div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourstore.com" autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="login-password" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              Password
              <span onClick={onForgot} style={{ fontSize: 12, color: "#4f46e5", cursor: "pointer", fontWeight: 500, textTransform: "none", letterSpacing: 0 }}>
                Forgot password?
              </span>
            </label>
            <div className="pwd-wrap">
              <input
                id="login-password"
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
              />
              <PwdToggle shown={showPwd} onToggle={() => setShowPwd((s) => !s)} />
            </div>
          </div>

          <button className="btn btn-primary btn-full" style={{ marginTop: 4, opacity: busy ? 0.7 : 1, cursor: busy ? "not-allowed" : "pointer" }} onClick={submit} disabled={busy}>
            {busy ? "Signing in…" : "Sign in to Dashboard"}
          </button>

          <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />

          <div className="auth-switch">
            Don't have an account? <a onClick={onSignup}>Get started free</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FORGOT PASSWORD ────────────────────────────────────────
function ForgotPage({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function submit() {
    if (!email) return setAlert({ msg: "Please enter your email.", type: "error" });
    setBusy(true);
    try {
      const data = await authApi.forgotPassword(email);
      if (data.success) setAlert({ msg: data.message || "Check your email.", type: "success" });
      else setAlert({ msg: data.error || "Something went wrong.", type: "error" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Cannot connect to server.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page active" id="page-forgot" onKeyDown={(e) => e.key === "Enter" && submit()}>
      <AuthBack onClick={onBack} label="Back to sign in" />
      <div className="auth-wrap">
        <div className="auth-box">
          <AuthLogo />
          <h2>Reset your password</h2>
          <p>Enter your registered email and we'll send a reset link.</p>

          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">Email Address</label>
            <input id="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourstore.com" autoComplete="email" />
          </div>

          <button className="btn btn-primary btn-full" style={{ marginTop: 4, opacity: busy ? 0.7 : 1, cursor: busy ? "not-allowed" : "pointer" }} onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>

          <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />

          <div className="auth-switch">
            <a onClick={onBack} style={{ color: "#4f46e5", cursor: "pointer" }}>
              ← Back to sign in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── LANDING STATIC CONTENT ─────────────────────────────────
// Ported verbatim from the original #page-landing markup. `data-reveal`
// (scroll-triggered fade-in) and the Three.js hero background / cursor
// glow are intentionally omitted — those are pure visual polish driven by
// IntersectionObserver/Three.js JS that isn't wired up yet, and since
// [data-reveal] elements start at opacity:0 in the original CSS, leaving
// the attribute in without the JS that reveals it would make the whole
// page invisible. Everything else (colors, layout, copy, structure) is
// unchanged.
function LandingSections({
  onShowPage,
  onScrollTo,
}: {
  onShowPage: (name: View) => void;
  onScrollTo: (id: string) => void;
}) {
  const progressFillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      if (progressFillRef.current) {
        progressFillRef.current.style.height = `${Math.min(100, Math.max(0, pct))}%`;
      }
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="page active" id="page-landing">
      <div className="landing-progress" aria-hidden="true">
        <div className="landing-progress-fill" ref={progressFillRef} />
      </div>
      <div className="landing-wrap">
        <section className="hero-section">
          <div className="hero-three-bg" />
          <div className="hero-cursor-glow" />
          <div className="hero-eyebrow">⚡ Now with WooCommerce Auto-Sync</div>
          <h1 className="hero-h1">
            Your PC Store. Open 24/7.
            <br />
            Instant Recommendations While You Sleep.
          </h1>
          <p className="hero-sub">
            BuildVolt reads your product catalog and recommends complete, compatible PC builds to your customers —
            instantly, for any budget, in PKR. One line of code. No developer needed.
          </p>
          <div className="hero-ctas">
            <button className="landing-btn primary" onClick={() => onShowPage("signup")}>
              Get Started — Free
            </button>
            <button className="landing-btn secondary" onClick={() => onScrollTo("how-it-works")}>
              See How It Works →
            </button>
          </div>
          <div className="hero-trust">No credit card required · Free to use · Set up in minutes</div>
          <div className="hero-mockup">
            <div className="chat-shell">
              <div className="chat-head">
                <span>⚡ BuildVolt</span>
                <span>X</span>
              </div>
              <div className="chat-body">
                <div className="msg user">Gaming build, budget Rs 80,000</div>
                <div className="msg ai">
                  Got it. Here is a compatible build from your catalog.
                  <div className="mini-build">
                    <h4>Balanced 1080p Gaming</h4>
                    <div className="row">
                      <span>CPU</span>
                      <span>Ryzen 5 7600</span>
                    </div>
                    <div className="row">
                      <span>GPU</span>
                      <span>Radeon RX 7600</span>
                    </div>
                    <div className="row">
                      <span>RAM</span>
                      <span>16GB DDR5</span>
                    </div>
                    <div className="row">
                      <span>Storage</span>
                      <span>1TB NVMe SSD</span>
                    </div>
                    <div className="row">
                      <span>Motherboard</span>
                      <span>B650M</span>
                    </div>
                    <div className="row">
                      <span>Total</span>
                      <span>Rs 79,800</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="social-proof">
          <div className="social-inner">
            <span className="social-line" />
            <p className="social-text">Trusted by PC stores in Lahore · Karachi · Islamabad · Rawalpindi</p>
            <span className="social-line" />
          </div>
        </section>

        <section id="how-it-works">
          <div className="section-label">HOW IT WORKS</div>
          <h2 className="section-title">From Setup to Sales in 60 Seconds</h2>
          <p className="section-subtitle">Three steps. No developer. No complexity.</p>
          <div className="how-steps">
            <article className="step">
              <div className="step-num">01</div>
              <h3>Upload Your Catalog</h3>
              <p>
                Export your products as a CSV, or connect your WooCommerce store. BuildVolt learns exactly what you
                sell and at what price.
              </p>
            </article>
            <article className="step">
              <div className="step-num">02</div>
              <h3>Paste One Line of Code</h3>
              <p>
                Copy your unique embed snippet and paste it before &lt;/body&gt; on your website. The widget appears
                instantly.
              </p>
            </article>
            <article className="step">
              <div className="step-num">03</div>
              <h3>Watch Builds Get Recommended</h3>
              <p>
                Customers enter their budget and purpose. BuildVolt recommends compatible builds using only your
                products, in PKR, 24/7.
              </p>
            </article>
          </div>
        </section>

        <section className="features-section grid-overlay">
          <div className="section-label">WHAT YOU GET</div>
          <h2 className="section-title">Everything a PC Store Needs. Nothing It Doesn't.</h2>
          <div className="features-grid">
            {[
              ["🤖", "Always Knows Your Inventory", "Builds are generated using only products you actually stock. No hallucinated parts, no out-of-stock items."],
              ["⚡", "One-Line Installation", "Paste a single script tag and you're live. No developer, no plugin conflicts, no configuration."],
              ["📊", "Real-Time Analytics", "See how many builds were suggested, what budgets your customers have, what they actually want to build."],
              ["🎨", "Matches Your Brand", "Set your store's color. The widget looks native — not like a third-party tool bolted on."],
              ["🔌", "WooCommerce Auto-Sync", "Connect once. Your products sync automatically, every 6 hours. Stock changes update in real-time."],
              ["🇵🇰", "Built for Pakistan", "Recommendations priced in PKR, built by someone who understands the local market."],
            ].map(([icon, title, desc]) => (
              <article className="feature-card" key={title}>
                <div className="feature-icon">{icon}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="impact-strip">
          <div className="section-label">STORE IMPACT</div>
          <h2 className="section-title">Results That Feel Like Extra Staff</h2>
          <p className="section-subtitle">
            BuildVolt handles repetitive pre-sales queries so your team can close serious buyers faster.
          </p>
          <div className="impact-grid">
            {[
              ["24/7", "Always-on recommendations, even outside business hours."],
              ["<3s", "Average response time from budget input to full build suggestion."],
              ["100%", "Inventory-aware outputs so customers only see parts you actually sell."],
              ["PKR", "Native local pricing language customers trust instantly."],
            ].map(([value, label]) => (
              <article className="impact-card" key={value}>
                <div className="impact-value">{value}</div>
                <div className="impact-label">{label}</div>
              </article>
            ))}
          </div>
        </section>

        <section>
          <div className="section-label">SEE IT IN ACTION</div>
          <h2 className="section-title">What Your Customers See</h2>
          <div className="demo-layout">
            <div className="demo-copy">
              <h3>An automated sales assistant that works without you.</h3>
              <p>
                A floating chat bubble sits on your website. When a customer clicks it, they tell BuildVolt their
                budget and what they want to build. In seconds, they get a complete, compatible build recommendation
                using only what you sell — with prices in PKR.
              </p>
              <ul className="check-list">
                <li>Works on any website or WooCommerce store</li>
                <li>Responds in under 3 seconds</li>
                <li>Available 24/7, even when you're closed</li>
                <li>Recommends compatible parts only</li>
              </ul>
            </div>
            <div className="widget-panel">
              <div className="widget-header">
                <span>
                  <strong>⚡ BuildVolt</strong> · TechZone Lahore
                </span>
                <span>X</span>
              </div>
              <div className="widget-body">
                <div className="progress">
                  <span />
                  <span />
                  <span className="active" />
                </div>
                <div className="build-card">
                  <h4>Performance Gaming Build</h4>
                  <table className="build-table">
                    <tbody>
                      <tr>
                        <td>CPU</td>
                        <td>Ryzen 5 7600</td>
                      </tr>
                      <tr>
                        <td>GPU</td>
                        <td>RX 7600 8GB</td>
                      </tr>
                      <tr>
                        <td>RAM</td>
                        <td>16GB DDR5</td>
                      </tr>
                      <tr>
                        <td>Storage</td>
                        <td>1TB NVMe SSD</td>
                      </tr>
                      <tr>
                        <td>PSU</td>
                        <td>650W 80+ Bronze</td>
                      </tr>
                      <tr>
                        <td>Case</td>
                        <td>Mid Tower Airflow</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="build-total">
                    <span>Total</span>
                    <span>Rs 124,900</span>
                  </div>
                </div>
                <p className="widget-tips">
                  Tip: Upgrade to 32GB RAM later for video editing. Current build is perfect for 1080p high settings
                  gaming.
                </p>
                <div className="powered">Powered by BuildVolt</div>
              </div>
            </div>
          </div>
        </section>

        <section className="use-cases grid-overlay">
          <div className="section-label">WHERE IT WINS</div>
          <h2 className="section-title">Built for Real Store Workflows</h2>
          <p className="section-subtitle">
            From first click to purchase confidence, BuildVolt removes buying friction at every stage.
          </p>
          <div className="use-cases-grid">
            {[
              ["For new buyers", "Budget to Build, Instantly", "First-time customers stop guessing. They get a compatible build recommendation in seconds without waiting for WhatsApp replies."],
              ["For busy teams", "Less Repetition, Better Closings", "Your staff spends less time answering the same budget questions and more time handling high-intent buyers ready to checkout."],
              ["For growth stores", "Scales Without Hiring Pressure", "As traffic grows, BuildVolt keeps responses consistent and fast so your conversion quality does not drop during peak demand."],
            ].map(([kicker, title, desc]) => (
              <article className="use-case-card" key={title}>
                <div className="use-case-kicker">{kicker}</div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
          <div className="integrations-row">
            <div className="integration-pill">WooCommerce Sync</div>
            <div className="integration-pill">CSV Catalog Import</div>
            <div className="integration-pill">Brand Color Matching</div>
            <div className="integration-pill">Live Recommendation Analytics</div>
          </div>
        </section>

        <section>
          <div className="section-label">FAQ</div>
          <h2 className="section-title">Questions Answered</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>Do I need a developer to install BuildVolt?</summary>
              <p>
                No. You get a single line of code to paste on your website. If you can add a Facebook Pixel or
                Google Analytics, you can add BuildVolt.
              </p>
            </details>
            <details className="faq-item">
              <summary>What if I don't have a website — only a WooCommerce store?</summary>
              <p>
                BuildVolt has a WordPress plugin that connects directly to WooCommerce. Your products sync
                automatically, and the widget appears on your store with one click.
              </p>
            </details>
            <details className="faq-item">
              <summary>Does it recommend products from other stores?</summary>
              <p>
                Never. BuildVolt only recommends products from your catalog that are marked in-stock. Your customers
                stay on your store.
              </p>
            </details>
          </div>
        </section>

        <section className="final-cta">
          <h2>
            Your Competitors' Customers
            <br />
            Are Already Asking BuildVolt.
          </h2>
          <p>Get started today — free to use, no credit card, no commitment. Just a smarter PC store.</p>
          <button className="landing-btn primary" style={{ padding: "16px 44px", fontSize: 16 }} onClick={() => onShowPage("signup")}>
            Get Started Free →
          </button>
          <div className="tiny">Takes less than 2 minutes to set up.</div>
        </section>

        <footer className="landing-footer">
          <div className="footer-top">
            <div>
              <div className="footer-brand">⚡ BuildVolt</div>
              <div className="footer-copy">Instant PC build recommendations for Pakistani stores.</div>
              <div className="footer-made">Made in Pakistan 🇵🇰</div>
            </div>
            <div className="footer-right">
              <a onClick={() => onScrollTo("how-it-works")}>Features</a>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <a onClick={() => onShowPage("login")}>Login</a>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <a onClick={() => onShowPage("signup")}>Get Started Free</a>
            </div>
          </div>
          <div className="footer-bottom">© {new Date().getFullYear()} BuildVolt · All rights reserved</div>
        </footer>
      </div>
    </div>
  );
}
