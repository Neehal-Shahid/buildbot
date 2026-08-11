import { useState } from "react";
import { adminApi } from "../../lib/adminApi";
import { ApiError } from "../../lib/api";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { BrandLogo } from "../../components/BrandLogo";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { PasswordInput } from "../../components/ui/PasswordInput";

type View = "signin" | "forgot" | "reset";

export default function AdminLogin() {
  const resetToken = new URLSearchParams(window.location.search).get(
    "reset_token",
  );
  const [view, setView] = useState<View>(resetToken ? "reset" : "signin");
  const { login } = useAdminAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-5 py-6">
      <div className="w-full max-w-[420px] rounded-2xl border border-border bg-surface p-9 shadow-sm">
        <div className="mb-6">
          <BrandLogo />
        </div>
        {view === "signin" && (
          <SignInView onForgot={() => setView("forgot")} onLogin={login} />
        )}
        {view === "forgot" && <ForgotView onBack={() => setView("signin")} />}
        {view === "reset" && resetToken && (
          <ResetView token={resetToken} onDone={() => setView("signin")} />
        )}
      </div>
    </div>
  );
}

function SignInView({
  onForgot,
  onLogin,
}: {
  onForgot: () => void;
  onLogin: (token: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email || !password) {
      setError("Email and password required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.login(email, password);
      onLogin(data.token);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
      }}
    >
      <h2 className="mb-1 text-xl font-bold tracking-tight text-text">
        Admin sign in
      </h2>
      <p className="mb-6 text-[13px] leading-relaxed text-muted">
        Platform administration panel.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none transition-colors focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
        />
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Password
        </label>
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <Button onClick={submit} loading={loading} className="w-full">
        Sign in
      </Button>

      {error && (
        <div className="mt-3.5">
          <InlineAlert type="error" message={error} />
        </div>
      )}

      <div className="mt-4 text-center text-[13px] text-muted">
        <button
          type="button"
          onClick={onForgot}
          className="font-semibold text-accent hover:underline"
        >
          Forgot password?
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
      setResult({ type: "error", msg: "Email required." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await adminApi.forgotPassword(email);
      setResult({ type: "success", msg: data.message });
    } catch (err) {
      setResult({
        type: "error",
        msg: err instanceof ApiError ? err.message : "Cannot connect to server.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold tracking-tight text-text">
        Reset admin password
      </h2>
      <p className="mb-6 text-[13px] leading-relaxed text-muted">
        Enter your primary or recovery email — we'll send a reset link.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none transition-colors focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
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
        <button type="button" onClick={onBack} className="font-semibold text-accent hover:underline">
          Back to sign in
        </button>
      </div>
    </div>
  );
}

function ResetView({ token, onDone }: { token: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function submit() {
    if (!password || !confirm) {
      setResult({ type: "error", msg: "Please fill in both fields." });
      return;
    }
    if (password !== confirm) {
      setResult({ type: "error", msg: "Passwords do not match." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const data = await adminApi.resetPassword(token, password);
      if (data.success) {
        setResult({ type: "success", msg: "Password reset! Redirecting to sign in…" });
        setTimeout(onDone, 2000);
      } else {
        setResult({ type: "error", msg: data.error || "Something went wrong." });
      }
    } catch (err) {
      setResult({
        type: "error",
        msg: err instanceof ApiError ? err.message : "Cannot connect to server.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold tracking-tight text-text">
        Set new admin password
      </h2>
      <p className="mb-6 text-[13px] leading-relaxed text-muted">
        Must be 8+ characters with uppercase, lowercase, number, and special character.
      </p>

      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          New Password
        </label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="mb-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Confirm Password
        </label>
        <PasswordInput
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </div>

      <Button onClick={submit} loading={loading} className="w-full">
        Reset Password
      </Button>

      {result && (
        <div className="mt-3.5">
          <InlineAlert type={result.type} message={result.msg} />
        </div>
      )}
    </div>
  );
}
