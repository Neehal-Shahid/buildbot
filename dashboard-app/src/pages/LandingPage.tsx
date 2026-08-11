import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/authApi";
import { ApiError } from "../lib/api";
import {
  clearStoreSession,
  getStoreSession,
  getStoreToken,
  isStoreTokenExpired,
  setStoreSession,
} from "../lib/session";
import { BrandLogo } from "../components/BrandLogo";
import { GoogleSignInButton } from "../components/GoogleSignInButton";
import { Button } from "../components/ui/Button";
import { InlineAlert } from "../components/ui/InlineAlert";
import { PasswordInput } from "../components/ui/PasswordInput";

type View = "landing" | "login" | "signup" | "forgot" | "verify-pending";

export default function LandingPage() {
  const navigate = useNavigate();
  const forceDashboard =
    new URLSearchParams(window.location.search).get("dashboard") === "1";

  const [view, setView] = useState<View>(forceDashboard ? "login" : "landing");
  const [loggedIn, setLoggedIn] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [loginAlert, setLoginAlert] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  // Mirrors the original window.onload bootstrap: verify any existing
  // session against the server, redirect to the dashboard if this page was
  // entered via the dedicated ?dashboard=1 login entrypoint, and handle the
  // ?verify=required deep link from links that require a verified session.
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
          } else {
            clearStoreSession();
            setLoggedIn(false);
            setView(forceDashboard ? "login" : "landing");
          }
        } catch {
          // Server unreachable — trust the local session like the original did.
          if (forceDashboard) navigate("/dashboard.html");
        }
      } else {
        const verifyParam = new URLSearchParams(window.location.search).get("verify");
        if (verifyParam === "required") {
          setView("login");
          setLoginAlert("Please verify your email before accessing the dashboard.");
        } else {
          setView(forceDashboard ? "login" : "landing");
        }
      }
      setChecked(true);
    }
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAuthed(token: string, store: import("../lib/session").StoreSession) {
    setStoreSession(token, store);
    setLoggedIn(true);
    navigate("/dashboard.html");
  }

  function logout() {
    clearStoreSession();
    setLoggedIn(false);
    setView("landing");
  }

  if (!checked) return null;

  return (
    <div className="min-h-screen bg-bg">
      <Nav
        view={view}
        loggedIn={loggedIn}
        onNav={setView}
        onLogout={logout}
        onGoDashboard={() => navigate("/dashboard.html")}
      />

      {view === "landing" && <Hero onGetStarted={() => setView("signup")} />}

      {view === "login" && (
        <AuthShell>
          <LoginView
            initialAlert={loginAlert}
            onAuthed={onAuthed}
            onForgot={() => setView("forgot")}
            onSignup={() => setView("signup")}
            onNeedsVerify={(email, password) => {
              setPendingEmail(email);
              setPendingPassword(password);
              setView("verify-pending");
            }}
          />
        </AuthShell>
      )}

      {view === "signup" && (
        <AuthShell>
          <SignupView
            onAuthed={onAuthed}
            onLogin={() => setView("login")}
            onNeedsVerify={(email, password) => {
              setPendingEmail(email);
              setPendingPassword(password);
              setView("verify-pending");
            }}
          />
        </AuthShell>
      )}

      {view === "forgot" && (
        <AuthShell>
          <ForgotView onBack={() => setView("login")} />
        </AuthShell>
      )}

      {view === "verify-pending" && (
        <AuthShell>
          <VerifyPendingView
            email={pendingEmail}
            password={pendingPassword}
            onVerified={() => setView("login")}
            onBack={() => setView("login")}
          />
        </AuthShell>
      )}
    </div>
  );
}

function Nav({
  view,
  loggedIn,
  onNav,
  onLogout,
  onGoDashboard,
}: {
  view: View;
  loggedIn: boolean;
  onNav: (v: View) => void;
  onLogout: () => void;
  onGoDashboard: () => void;
}) {
  if (view !== "landing") return null;
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-4">
      <BrandLogo />
      <nav className="flex items-center gap-4">
        {loggedIn ? (
          <>
            <button onClick={onGoDashboard} className="text-sm font-medium text-text-2 hover:text-text">
              Dashboard
            </button>
            <button onClick={onLogout} className="text-sm font-medium text-text-2 hover:text-text">
              Sign out
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onNav("login")} className="text-sm font-medium text-text-2 hover:text-text">
              Sign in
            </button>
            <button
              onClick={() => onNav("signup")}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Get started
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl">
        Sell the right PC build, every time.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        BuildVolt is a PC-build recommender widget for computer stores —
        drop it on your site and let customers get a build suggestion that
        fits their budget, instantly.
      </p>
      <Button onClick={onGetStarted} className="mt-8 !px-6 !py-3 !text-base">
        Get started free
      </Button>
    </div>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-73px)] items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-9 shadow-sm">
        <div className="mb-6">
          <BrandLogo />
        </div>
        {children}
      </div>
    </div>
  );
}

function LoginView({
  initialAlert,
  onAuthed,
  onForgot,
  onSignup,
  onNeedsVerify,
}: {
  initialAlert: string | null;
  onAuthed: (token: string, store: import("../lib/session").StoreSession) => void;
  onForgot: () => void;
  onSignup: () => void;
  onNeedsVerify: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(initialAlert);

  async function submit() {
    if (!email || !password) {
      setAlert("Please fill all fields.");
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const data = await authApi.login(email, password);
      if (data.success && data.token && data.store) {
        onAuthed(data.token, data.store);
      } else if (data.requiresVerification) {
        onNeedsVerify(email, password);
      } else {
        setAlert(data.error || "Login failed.");
      }
    } catch (err) {
      setAlert(err instanceof ApiError ? err.message : "Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onKeyDown={(e) => e.key === "Enter" && submit()}>
      <h2 className="mb-1 text-xl font-bold tracking-tight text-text">Sign in</h2>
      <p className="mb-5 text-[13px] text-muted">Welcome back.</p>

      <GoogleSignInButton
        context="signin"
        onCredential={async (credential) => {
          setLoading(true);
          try {
            const data = await authApi.googleAuth(credential);
            if (data.success && data.token && data.store) onAuthed(data.token, data.store);
            else setAlert(data.error || "Google login failed.");
          } catch {
            setAlert("Connection error.");
          } finally {
            setLoading(false);
          }
        }}
      />
      <div className="my-4 text-center text-xs text-dim">or continue with email</div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
        />
      </div>
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">Password</label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
      </div>

      <Button onClick={submit} loading={loading} className="w-full">
        Sign in
      </Button>
      {alert && (
        <div className="mt-3.5">
          <InlineAlert type="error" message={alert} />
        </div>
      )}

      <div className="mt-4 flex justify-between text-[13px] text-muted">
        <button onClick={onForgot} className="font-semibold text-accent hover:underline">
          Forgot password?
        </button>
        <button onClick={onSignup} className="font-semibold text-accent hover:underline">
          Create account
        </button>
      </div>
    </div>
  );
}

function SignupView({
  onAuthed,
  onLogin,
  onNeedsVerify,
}: {
  onAuthed: (token: string, store: import("../lib/session").StoreSession) => void;
  onLogin: () => void;
  onNeedsVerify: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);

  const score = (() => {
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) s++;
    return s;
  })();
  const strengthColors = ["#e74c3c", "#f39c12", "#f39c12", "#2ecc71", "#2ecc71"];

  async function submit() {
    if (!email || !password) {
      setAlert("Please fill all fields.");
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const data = await authApi.signup(email, password);
      if (data.success && data.requiresVerification) {
        onNeedsVerify(data.email || email, password);
      } else if (data.success) {
        setAlert(data.message || "Account created.");
      } else {
        setAlert(data.error || "Signup failed.");
      }
    } catch {
      setAlert("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onKeyDown={(e) => e.key === "Enter" && submit()}>
      <h2 className="mb-1 text-xl font-bold tracking-tight text-text">Create your account</h2>
      <p className="mb-5 text-[13px] text-muted">Free to use. No credit card needed.</p>

      <GoogleSignInButton
        context="signup"
        onCredential={async (credential) => {
          setLoading(true);
          try {
            const data = await authApi.googleAuth(credential);
            if (data.success && data.token && data.store) onAuthed(data.token, data.store);
            else setAlert(data.error || "Google signup failed.");
          } catch {
            setAlert("Connection error.");
          } finally {
            setLoading(false);
          }
        }}
      />
      <div className="my-4 text-center text-xs text-dim">or continue with email</div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">Email Address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourstore.com"
          autoComplete="email"
          className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
        />
      </div>
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">Password</label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min 8 characters"
          autoComplete="new-password"
        />
        <div className="mt-2 mb-1 h-[3px] overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(score / 4) * 100}%`, background: strengthColors[score] }}
          />
        </div>
        <div className="text-[11px] leading-relaxed text-dim">
          Use uppercase, lowercase, number and special character.
        </div>
      </div>

      <Button onClick={submit} loading={loading} className="w-full">
        Create account
      </Button>
      {alert && (
        <div className="mt-3.5">
          <InlineAlert type="error" message={alert} />
        </div>
      )}

      <div className="mt-4 text-center text-[13px] text-muted">
        Already have an account?{" "}
        <button onClick={onLogin} className="font-semibold text-accent hover:underline">
          Sign in
        </button>
      </div>
    </div>
  );
}

function ForgotView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function submit() {
    if (!email) {
      setResult({ type: "error", msg: "Please enter your email." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await authApi.forgotPassword(email);
      if (data.success) setResult({ type: "success", msg: data.message || "Check your email." });
      else setResult({ type: "error", msg: data.error || "Something went wrong." });
    } catch {
      setResult({ type: "error", msg: "Cannot connect to server." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div onKeyDown={(e) => e.key === "Enter" && submit()}>
      <h2 className="mb-1 text-xl font-bold tracking-tight text-text">Reset password</h2>
      <p className="mb-5 text-[13px] text-muted">We'll email you a reset link.</p>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
        />
      </div>

      <Button onClick={submit} loading={loading} className="w-full">
        Send reset link
      </Button>
      {result && (
        <div className="mt-3.5">
          <InlineAlert type={result.type} message={result.msg} />
        </div>
      )}

      <div className="mt-4 text-center text-[13px] text-muted">
        <button onClick={onBack} className="font-semibold text-accent hover:underline">
          Back to sign in
        </button>
      </div>
    </div>
  );
}

function VerifyPendingView({
  email,
  password,
  onVerified,
  onBack,
}: {
  email: string;
  password: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function verify() {
    if (!code || code.length !== 6) {
      setAlert({ type: "error", msg: "Please enter the 6-digit code from your email." });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const data = await authApi.verifyEmailOtp(email, code);
      if (data.success) {
        setAlert({ type: "success", msg: "Email verified! Redirecting to sign in…" });
        setTimeout(onVerified, 1200);
      } else {
        setAlert({ type: "error", msg: data.error || "Verification failed." });
      }
    } catch {
      setAlert({ type: "error", msg: "Cannot connect to server." });
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email || !password) {
      onBack();
      return;
    }
    setResending(true);
    setAlert(null);
    try {
      const data = await authApi.resendVerification(email, password);
      setAlert({
        type: data.success ? "success" : "error",
        msg: data.message || data.error || "Could not resend email.",
      });
    } catch {
      setAlert({ type: "error", msg: "Cannot connect to server." });
    } finally {
      setResending(false);
    }
  }

  return (
    <div onKeyDown={(e) => e.key === "Enter" && verify()}>
      <h2 className="mb-1 text-xl font-bold tracking-tight text-text">Verify your email</h2>
      <p className="mb-5 text-[13px] text-muted">
        We sent a 6-digit code to <strong className="text-text">{email}</strong>.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Verification code
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="123456"
          inputMode="numeric"
          className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-center text-lg tracking-[0.3em] text-text outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
        />
      </div>

      <Button onClick={verify} loading={loading} className="w-full">
        Verify email
      </Button>
      {alert && (
        <div className="mt-3.5">
          <InlineAlert type={alert.type} message={alert.msg} />
        </div>
      )}

      <div className="mt-4 flex justify-between text-[13px] text-muted">
        <button onClick={onBack} className="font-semibold text-accent hover:underline">
          Back to sign in
        </button>
        <button onClick={resend} disabled={resending} className="font-semibold text-accent hover:underline disabled:opacity-50">
          {resending ? "Sending…" : "Resend code"}
        </button>
      </div>
    </div>
  );
}
