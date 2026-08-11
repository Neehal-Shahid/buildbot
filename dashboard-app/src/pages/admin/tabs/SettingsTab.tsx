import { useEffect, useState } from "react";
import { adminApi } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ApiError } from "../../../lib/api";

function Alert({ msg, type }: { msg: string | null; type: "success" | "error" | null }) {
  if (!msg) return <div className="alert" id="settings-alert-slot" />;
  return <div className={`alert alert-${type} show`}>{msg}</div>;
}

const EyeIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export default function SettingsTab() {
  const { token } = useAdminAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    if (!token) return;
    adminApi.me(token).then((data) => {
      setName(data.admin.name);
      setEmail(data.admin.email);
      setRecoveryEmail(data.admin.recoveryEmail || "");
    });
    adminApi.platformConfig(token).then((data) => {
      setMaintenanceMode(!!data.config.maintenance_mode);
    });
  }, [token]);

  return (
    <div>
      <div className="section-title">Admin Settings</div>
      <div className="section-sub">Manage your admin profile and password.</div>
      <div className="two-col">
        <ProfileCard name={name} email={email} setName={setName} setEmail={setEmail} />
        <RecoveryEmailCard recoveryEmail={recoveryEmail} setRecoveryEmail={setRecoveryEmail} />
        <ChangePasswordCard />
      </div>
      <PlatformConfigCard maintenanceMode={maintenanceMode} setMaintenanceMode={setMaintenanceMode} />
    </div>
  );
}

function ProfileCard({
  name,
  email,
  setName,
  setEmail,
}: {
  name: string;
  email: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
}) {
  const { token } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function save() {
    if (!token || !name || !email) return setAlert({ msg: "Name and email required", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.updateProfile(token, name, email);
      setAlert({ msg: data.message, type: "success" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Something went wrong.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Profile</h2>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@buildvolt.pk" />
      </div>
      <button className="btn btn-primary" id="prof-save-btn" onClick={save} disabled={busy}>
        Save Profile
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function RecoveryEmailCard({
  recoveryEmail,
  setRecoveryEmail,
}: {
  recoveryEmail: string;
  setRecoveryEmail: (v: string) => void;
}) {
  const { token } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function save() {
    if (!token) return;
    setBusy(true);
    try {
      const data = await adminApi.updateRecoveryEmail(token, recoveryEmail);
      setAlert({ msg: data.message, type: "success" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Something went wrong.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Recovery Email</h2>
          <div className="card-sub">
            Backup access if you ever lose your primary email. You can sign in or reset your password using either
            address.
          </div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Recovery Email (optional)</label>
        <input type="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} placeholder="backup@example.com" />
      </div>
      <button className="btn btn-primary" id="recovery-save-btn" onClick={save} disabled={busy}>
        Save Recovery Email
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function ChangePasswordCard() {
  const { token } = useAdminAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function save() {
    if (!token || !current || !next) return setAlert({ msg: "Both passwords are required.", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.updatePassword(token, current, next);
      setAlert({ msg: data.message, type: "success" });
      setCurrent("");
      setNext("");
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Something went wrong.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Change Password</h2>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Current Password</label>
        <div className="pwd-wrap">
          <input
            type={showCurrent ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            style={{ paddingRight: 38 }}
          />
          <span className="pwd-toggle" onClick={() => setShowCurrent((s) => !s)}>
            <EyeIcon />
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">New Password</label>
        <div className="pwd-wrap">
          <input
            type={showNext ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Min 8 chars"
            style={{ paddingRight: 38 }}
          />
          <span className="pwd-toggle" onClick={() => setShowNext((s) => !s)}>
            <EyeIcon />
          </span>
        </div>
      </div>
      <button className="btn btn-primary" id="cp-save-btn" onClick={save} disabled={busy}>
        Change Password
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function PlatformConfigCard({
  maintenanceMode,
  setMaintenanceMode,
}: {
  maintenanceMode: boolean;
  setMaintenanceMode: (v: boolean) => void;
}) {
  const { token } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function save() {
    if (!token) return;
    setBusy(true);
    try {
      const data = await adminApi.savePlatformConfig(token, { maintenance_mode: maintenanceMode });
      setAlert({ msg: data.message, type: "success" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Something went wrong.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <div>
          <h2>Platform Configuration</h2>
          <div className="card-sub">Control platform defaults without redeploying code</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={save} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--r-md)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>Maintenance Mode</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            When enabled, all store widgets will stop working and show a maintenance message.
          </div>
        </div>
        <label style={{ position: "relative", display: "inline-block", width: 44, height: 24, flexShrink: 0 }}>
          <input
            type="checkbox"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
          />
          <span
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            id="cfg-maintenance-toggle"
            style={{
              position: "absolute",
              cursor: "pointer",
              inset: 0,
              background: maintenanceMode ? "var(--danger)" : "var(--border-2)",
              borderRadius: 24,
              transition: "0.2s",
            }}
          />
        </label>
      </div>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}
