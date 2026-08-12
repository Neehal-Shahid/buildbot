import { useEffect, useState } from "react";
import { adminApi } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ApiError } from "../../../lib/api";

function Alert({ msg, type }: { msg: string | null; type: "success" | "error" | null }) {
  if (!msg) return <div className="alert" id="settings-alert-slot" />;
  return <div className={`alert alert-${type} show`}>{msg}</div>;
}

// platform_config rows are persisted by the backend as TEXT — configDB
// stores String(value), the seed row is ('maintenance_mode', 'false') and
// recommend.js gates the widget on `=== "true"`. A plain truthiness check
// on the returned value therefore reads the *string* "false" as true, which
// showed this toggle permanently ON and risked an admin saving that back
// and taking every store widget offline.
function isConfigTrue(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
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
  const [budgetPresets, setBudgetPresets] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    adminApi
      .me(token)
      .then((data) => {
        setName(data.admin.name);
        setEmail(data.admin.email);
        setRecoveryEmail(data.admin.recoveryEmail || "");
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Could not load your admin profile."),
      );
    adminApi
      .platformConfig(token)
      .then((data) => {
        setMaintenanceMode(isConfigTrue(data.config.maintenance_mode));
        setBudgetPresets(String(data.config.budget_presets ?? "50000,80000,120000,200000"));
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Could not load platform configuration."),
      );
  }, [token]);

  return (
    <div>
      <div className="section-title">Admin Settings</div>
      <div className="section-sub">Manage your admin profile, password and platform-wide configuration.</div>
      {loadError && <div className="alert alert-error show">{loadError}</div>}
      <div className="two-col">
        <ProfileCard name={name} email={email} setName={setName} setEmail={setEmail} />
        <RecoveryEmailCard recoveryEmail={recoveryEmail} setRecoveryEmail={setRecoveryEmail} />
        <ChangePasswordCard />
      </div>
      <PlatformConfigCard
        maintenanceMode={maintenanceMode}
        setMaintenanceMode={setMaintenanceMode}
        budgetPresets={budgetPresets}
        setBudgetPresets={setBudgetPresets}
      />
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
    if (!token) return;
    if (!name || !email) return setAlert({ msg: "Name and email required", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.updateProfile(token, name, email);
      setAlert({ msg: data.message, type: "success" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Could not save your profile.", type: "error" });
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
        <label className="form-label" htmlFor="prof-name">
          Name
        </label>
        <input id="prof-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="prof-email">
          Email
        </label>
        <input id="prof-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@buildvolt.pk" />
      </div>
      <button className="btn btn-primary" id="prof-save-btn" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save Profile"}
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
      setAlert({ msg: err instanceof ApiError ? err.message : "Could not save your recovery email.", type: "error" });
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
        <label className="form-label" htmlFor="recovery-email">
          Recovery Email (optional)
        </label>
        <input
          id="recovery-email"
          type="email"
          value={recoveryEmail}
          onChange={(e) => setRecoveryEmail(e.target.value)}
          placeholder="backup@example.com"
        />
      </div>
      <button className="btn btn-primary" id="recovery-save-btn" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save Recovery Email"}
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
    if (!token) return;
    if (!current || !next) return setAlert({ msg: "Both passwords are required.", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.updatePassword(token, current, next);
      setAlert({ msg: data.message, type: "success" });
      setCurrent("");
      setNext("");
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Could not change your password.", type: "error" });
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
        <label className="form-label" htmlFor="cp-current">
          Current Password
        </label>
        <div className="pwd-wrap">
          <input
            id="cp-current"
            type={showCurrent ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
            style={{ paddingRight: 38 }}
          />
          <span
            className="pwd-toggle"
            role="button"
            tabIndex={0}
            aria-label={showCurrent ? "Hide current password" : "Show current password"}
            onClick={() => setShowCurrent((s) => !s)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowCurrent((s) => !s);
              }
            }}
          >
            <EyeIcon />
          </span>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="cp-next">
          New Password
        </label>
        <div className="pwd-wrap">
          <input
            id="cp-next"
            type={showNext ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="Min 8 chars"
            autoComplete="new-password"
            style={{ paddingRight: 38 }}
          />
          <span
            className="pwd-toggle"
            role="button"
            tabIndex={0}
            aria-label={showNext ? "Hide new password" : "Show new password"}
            onClick={() => setShowNext((s) => !s)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowNext((s) => !s);
              }
            }}
          >
            <EyeIcon />
          </span>
        </div>
      </div>
      <button className="btn btn-primary" id="cp-save-btn" onClick={save} disabled={busy}>
        {busy ? "Changing…" : "Change Password"}
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function PlatformConfigCard({
  maintenanceMode,
  setMaintenanceMode,
  budgetPresets,
  setBudgetPresets,
}: {
  maintenanceMode: boolean;
  setMaintenanceMode: (v: boolean) => void;
  budgetPresets: string;
  setBudgetPresets: (v: string) => void;
}) {
  const { token } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Mirrors the exact parsing rule server/routes/auth.js applies to
  // GET /store-config (comma-separated positive integers, at least 2, or
  // the request silently falls back to the hardcoded defaults) — checked
  // here too so a bad value gets caught before saving instead of being
  // saved and quietly ignored everywhere it's used.
  function parsedPresets(): number[] {
    return budgetPresets
      .split(",")
      .map((v) => parseInt(v.trim(), 10))
      .filter((v) => Number.isFinite(v) && v > 0);
  }

  async function save() {
    if (!token) return;
    const presets = parsedPresets();
    if (presets.length < 2) {
      setAlert({ msg: "Enter at least 2 valid budget amounts, comma-separated (e.g. 50000,80000,120000,200000).", type: "error" });
      return;
    }
    setBusy(true);
    try {
      // Persist the exact string form the rest of the backend compares
      // against (recommend.js: `maintenanceMode === "true"`).
      const data = await adminApi.savePlatformConfig(token, {
        maintenance_mode: maintenanceMode ? "true" : "false",
        budget_presets: presets.join(","),
      });
      setAlert({ msg: data.message, type: "success" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Could not save platform configuration.", type: "error" });
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
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--r-md)" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>Maintenance Mode</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            When enabled, all store widgets will stop working and show a maintenance message.
          </div>
        </div>
        {/* The checkbox id is what drives admin.css's
            `#cfg-maintenance-mode:checked + #cfg-maintenance-toggle::after`
            knob-slide rules — without it the white knob never moves. The
            wrapping <label> forwards clicks to the checkbox, so the track
            needs no click handler of its own. */}
        <label
          htmlFor="cfg-maintenance-mode"
          style={{ position: "relative", display: "inline-block", width: 44, height: 24, flexShrink: 0, cursor: "pointer" }}
        >
          <input
            id="cfg-maintenance-mode"
            type="checkbox"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0, position: "absolute" }}
          />
          <span
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

      <div className="form-group" style={{ marginTop: 16 }}>
        <label className="form-label" htmlFor="cfg-budget-presets">
          Budget Preset Amounts (PKR)
        </label>
        <input
          id="cfg-budget-presets"
          type="text"
          value={budgetPresets}
          onChange={(e) => setBudgetPresets(e.target.value)}
          placeholder="50000,80000,120000,200000"
        />
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
          Comma-separated amounts — these are the quick-select budget buttons every store's customer-facing widget
          shows. At least two values required, or the widget falls back to its built-in defaults.
        </div>
      </div>

      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}
