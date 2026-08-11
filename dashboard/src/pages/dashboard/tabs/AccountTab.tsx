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

export default function AccountTab() {
  return (
    <div>
      <div className="section-title">Account</div>
      <div className="section-sub">Manage your password, security, &amp; account settings.</div>

      <SupportCard />
      <SecurityCard />
      <ForgotPasswordCard />
      <EmailPreferencesCard />
      <DangerZoneCard />
    </div>
  );
}

function SupportCard() {
  const { token } = useStoreAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function submit() {
    if (!token || !subject || !message) return setAlert({ msg: "Fill in both fields.", type: "error" });
    setBusy(true);
    try {
      const data = await dashboardApi.support.submit(token, subject, message);
      setAlert({ msg: data.message, type: "success" });
      setSubject("");
      setMessage("");
    } catch {
      setAlert({ msg: "Could not submit ticket.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16, borderColor: "var(--accent-border)" }}>
      <h2>Contact Support</h2>
      <p style={{ marginBottom: 16 }}>Have a problem, complaint, or question? Send a message to the BuildVolt team.</p>
      <div className="form-group">
        <label className="form-label">Subject</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your issue" maxLength={150} />
      </div>
      <div className="form-group">
        <label className="form-label">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={2000} placeholder="Describe your issue in detail…" />
      </div>
      <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>
        Submit support request
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} style={{ marginTop: 12 }} />
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
    setBusy(true);
    try {
      const data = await dashboardApi.changePassword(token, current, next);
      if (data.success) {
        setAlert({ msg: data.message, type: "success" });
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setAlert({ msg: data.error || "Something went wrong.", type: "error" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Something went wrong.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>Security</h2>
      <p style={{ marginBottom: 20 }}>Change your account password.</p>
      <div className="form-group">
        <label className="form-label">Current Password</label>
        <div className="pwd-wrap">
          <input type={showCurrent ? "text" : "password"} value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current password" style={{ maxWidth: 320 }} />
          <span className="pwd-toggle" onClick={() => setShowCurrent((s) => !s)}>
            <EyeIcon />
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">New Password</label>
        <div className="pwd-wrap">
          <input type={showNext ? "text" : "password"} value={next} onChange={(e) => setNext(e.target.value)} placeholder="Min 8 chars, uppercase, number, symbol" style={{ maxWidth: 320 }} />
          <span className="pwd-toggle" onClick={() => setShowNext((s) => !s)}>
            <EyeIcon />
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Confirm New Password</label>
        <div className="pwd-wrap">
          <input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" style={{ maxWidth: 320 }} />
          <span className="pwd-toggle" onClick={() => setShowConfirm((s) => !s)}>
            <EyeIcon />
          </span>
        </div>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={busy}>
        Change Password
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
    if (!email) return setAlert({ msg: "Email required.", type: "error" });
    setBusy(true);
    try {
      const data = await authApi.forgotPassword(email);
      setAlert({ msg: data.message || data.error || "", type: data.success ? "success" : "error" });
    } catch {
      setAlert({ msg: "Connection error.", type: "error" });
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
        <label className="form-label">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ maxWidth: 360 }} />
      </div>
      <button type="button" className="btn btn-outline btn-sm" onClick={submit} disabled={busy}>
        Email reset link
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} style={{ maxWidth: 420 }} />
    </div>
  );
}

function EmailPreferencesCard() {
  const { token, store, refresh } = useStoreAuth();
  const [checked, setChecked] = useState(store?.marketingEmailsEnabled ?? true);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function toggle(next: boolean) {
    if (!token) return;
    setChecked(next);
    try {
      const data = await dashboardApi.emailPreferences(token, next);
      setAlert({ msg: data.message, type: "success" });
      refresh();
    } catch {
      setAlert({ msg: "Could not update preference.", type: "error" });
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2>Email Preferences</h2>
      <p style={{ marginBottom: 16 }}>Control onboarding tips and promotional emails. Account and security emails are always sent.</p>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13, color: "var(--text)" }}>
        <input type="checkbox" checked={checked} onChange={(e) => toggle(e.target.checked)} />
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

  async function deleteAccount() {
    if (confirmText !== store?.storeId) {
      toast.error("Store ID didn't match", "Account was not deleted.");
      return;
    }
    if (!token) return;
    try {
      await dashboardApi.deleteAccount(token);
      toast.success("Account deleted", "");
      logout();
    } catch {
      toast.error("Error", "Could not delete account.");
    }
  }

  return (
    <div className="card" style={{ borderColor: "var(--danger-border)" }}>
      <h2 style={{ color: "var(--danger)" }}>Danger Zone</h2>
      <p style={{ marginBottom: 20 }}>Permanently delete your account and all associated data. This action cannot be undone.</p>
      {!confirming ? (
        <button className="btn btn-danger" onClick={() => setConfirming(true)}>
          Delete Account
        </button>
      ) : (
        <div>
          <div className="form-group">
            <label className="form-label">Type your Store ID to confirm: {store?.storeId}</label>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} style={{ maxWidth: 320 }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-danger" onClick={deleteAccount}>
              Confirm delete
            </button>
            <button className="btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
