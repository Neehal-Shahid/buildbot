import { useState } from "react";
import type { CSSProperties } from "react";
import { dashboardApi } from "../../../lib/dashboardApi";
import { authApi } from "../../../lib/authApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { ApiError } from "../../../lib/api";

function Alert({ msg, type, style }: { msg: string | null; type: "success" | "error" | null; style?: CSSProperties }) {
  if (!msg) return <div className="alert" style={style} />;
  return (
    <div className={`alert alert-${type} show`} style={style}>
      {msg}
    </div>
  );
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// Mirrors isStrongPassword() in server/routes/auth.js exactly — including
// the lowercase rule, which the old placeholder text left out entirely.
function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "New password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "New password needs at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "New password needs at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "New password needs at least one number.";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pw))
    return "New password needs at least one special character (e.g. Test@123).";
  return null;
}

export default function AccountTab() {
  return (
    <div>
      <div className="section-title">Account</div>
      <div className="section-sub">Manage your password, security, &amp; account settings.</div>

      <SecurityCard />
      <ForgotPasswordCard />
      <EmailPreferencesCard />
      <DangerZoneCard />
    </div>
  );
}

function SecurityCard() {
  const { token } = useStoreAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function save() {
    if (!token || !current || !next || !confirm) return setAlert({ msg: "All fields are required.", type: "error" });
    if (next !== confirm) return setAlert({ msg: "New passwords do not match.", type: "error" });
    // Check the same rule the server enforces before spending a round-trip.
    const problem = passwordProblem(next);
    if (problem) return setAlert({ msg: problem, type: "error" });
    if (next === current) return setAlert({ msg: "New password must be different from your current one.", type: "error" });
    setBusy(true);
    setAlert(null);
    try {
      const data = await dashboardApi.changePassword(token, current, next);
      if (data.success) {
        setAlert({ msg: data.message, type: "success" });
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setAlert({ msg: data.error || "Could not change your password.", type: "error" });
      }
    } catch (err) {
      setAlert({
        msg: err instanceof ApiError ? err.message : "Could not change your password.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>Security</h2>
      <p style={{ marginBottom: 20 }}>Change your account password.</p>
      <div className="form-group">
        <label className="form-label" htmlFor="acct-current-pwd">
          Current Password
        </label>
        <div className="pwd-wrap">
          <input
            id="acct-current-pwd"
            type={showCurrent ? "text" : "password"}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            style={{ maxWidth: 320 }}
          />
          <span
            className="pwd-toggle"
            role="button"
            tabIndex={0}
            aria-label={showCurrent ? "Hide current password" : "Show current password"}
            onClick={() => setShowCurrent((s) => !s)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setShowCurrent((s) => !s)}
          >
            <EyeIcon />
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="acct-new-pwd">
          New Password
        </label>
        <div className="pwd-wrap">
          <input
            id="acct-new-pwd"
            type={showNext ? "text" : "password"}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Min 8 chars, upper + lowercase, number, symbol"
            style={{ maxWidth: 320 }}
          />
          <span
            className="pwd-toggle"
            role="button"
            tabIndex={0}
            aria-label={showNext ? "Hide new password" : "Show new password"}
            onClick={() => setShowNext((s) => !s)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setShowNext((s) => !s)}
          >
            <EyeIcon />
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="acct-confirm-pwd">
          Confirm New Password
        </label>
        <div className="pwd-wrap">
          <input
            id="acct-confirm-pwd"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
            style={{ maxWidth: 320 }}
          />
          <span
            className="pwd-toggle"
            role="button"
            tabIndex={0}
            aria-label={showConfirm ? "Hide confirmed password" : "Show confirmed password"}
            onClick={() => setShowConfirm((s) => !s)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setShowConfirm((s) => !s)}
          >
            <EyeIcon />
          </span>
        </div>
      </div>
      <button
        type="button"
        className={`btn btn-primary${busy ? " is-loading" : ""}`}
        onClick={save}
        disabled={busy}
      >
        {busy ? "Changing…" : "Change Password"}
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} style={{ maxWidth: 320 }} />
    </div>
  );
}

function ForgotPasswordCard() {
  const { store } = useStoreAuth();
  const [email, setEmail] = useState(store?.email || "");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function submit() {
    if (!email.trim()) return setAlert({ msg: "Enter the email to send the reset link to.", type: "error" });
    setBusy(true);
    setAlert(null);
    try {
      const data = await authApi.forgotPassword(email.trim());
      setAlert({
        msg: data.message || "If that email is registered, a reset link is on its way.",
        type: data.success ? "success" : "error",
      });
    } catch (err) {
      setAlert({
        msg: err instanceof ApiError ? err.message : "Could not send the reset email.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>Forgot password?</h2>
      <p style={{ marginBottom: 14, fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
        Same reset flow as the login page — we will email you a link to set a new password.
      </p>
      <div className="form-group">
        <label className="form-label" htmlFor="acct-reset-email">
          Email
        </label>
        <input
          id="acct-reset-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ maxWidth: 360 }}
        />
      </div>
      <button type="button" className="btn btn-outline btn-sm" onClick={submit} disabled={busy}>
        {busy ? "Sending…" : "Email reset link"}
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} style={{ maxWidth: 420 }} />
    </div>
  );
}

function EmailPreferencesCard() {
  const { token, store, refresh } = useStoreAuth();
  const [checked, setChecked] = useState(store?.marketingEmailsEnabled ?? true);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function toggle(next: boolean) {
    if (!token) return;
    const previous = checked;
    setChecked(next);
    setBusy(true);
    try {
      const data = await dashboardApi.emailPreferences(token, next);
      setAlert({ msg: data.message, type: "success" });
      refresh();
    } catch (err) {
      // Put the checkbox back — leaving it flipped told the owner their
      // preference had been saved when it hadn't.
      setChecked(previous);
      setAlert({
        msg: err instanceof ApiError ? err.message : "Could not update your email preference.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>Email Preferences</h2>
      <p style={{ marginBottom: 16 }}>Control onboarding tips and promotional emails. Account and security emails are always sent.</p>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: busy ? "wait" : "pointer", fontSize: 13, color: "var(--text)" }}>
        <input type="checkbox" checked={checked} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
        Receive onboarding tips and product updates
      </label>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} style={{ marginTop: 12 }} />
    </div>
  );
}

function DangerZoneCard() {
  const { token, store, logout } = useStoreAuth();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    if (confirmText.trim() !== store?.storeId) {
      toast.error("Store ID didn't match", "Your account was not deleted.");
      return;
    }
    if (!token || busy) return;
    setBusy(true);
    try {
      await dashboardApi.deleteAccount(token);
      toast.success("Account deleted", "Your store and all its data have been removed.");
      logout();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not delete your account.");
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ borderColor: "var(--danger-border)" }}>
      <h2 style={{ color: "var(--danger)" }}>Danger Zone</h2>
      <p style={{ marginBottom: 20 }}>
        Permanently delete your account, your product catalog, and every order request and recommendation
        recorded for your store. This action cannot be undone.
      </p>
      {!confirming ? (
        <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>
          Delete Account
        </button>
      ) : (
        <div>
          <div className="form-group">
            <label className="form-label" htmlFor="acct-delete-confirm">
              Type your Store ID to confirm: {store?.storeId}
            </label>
            <input
              id="acct-delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={store?.storeId}
              autoComplete="off"
              style={{ maxWidth: 320 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className={`btn btn-danger${busy ? " is-loading" : ""}`}
              onClick={deleteAccount}
              disabled={busy}
            >
              {busy ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setConfirming(false);
                setConfirmText("");
              }}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
