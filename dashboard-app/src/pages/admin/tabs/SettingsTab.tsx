import { useEffect, useState } from "react";
import { adminApi } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ApiError } from "../../../lib/api";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { InlineAlert } from "../../../components/ui/InlineAlert";
import { PasswordInput } from "../../../components/ui/PasswordInput";

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
    <div className="flex flex-col gap-4">
      <ProfileCard name={name} email={email} setName={setName} setEmail={setEmail} />
      <RecoveryEmailCard recoveryEmail={recoveryEmail} setRecoveryEmail={setRecoveryEmail} primaryEmail={email} />
      <ChangePasswordCard />
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
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function save() {
    if (!token) return;
    if (!name || !email) {
      setAlert({ type: "error", msg: "Name and email required" });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const data = await adminApi.updateProfile(token, name, email);
      setAlert({ type: "success", msg: data.message });
    } catch (err) {
      setAlert({ type: "error", msg: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Profile">
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          id="prof-name"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          id="prof-email"
          type="email"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <Button id="prof-save-btn" onClick={save} loading={loading}>
        Save profile
      </Button>
      {alert && (
        <div className="mt-3">
          <InlineAlert type={alert.type} message={alert.msg} />
        </div>
      )}
    </Card>
  );
}

function RecoveryEmailCard({
  recoveryEmail,
  setRecoveryEmail,
  primaryEmail,
}: {
  recoveryEmail: string;
  setRecoveryEmail: (v: string) => void;
  primaryEmail: string;
}) {
  const { token } = useAdminAuth();
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function save() {
    if (!token) return;
    setLoading(true);
    setAlert(null);
    try {
      const data = await adminApi.updateRecoveryEmail(token, recoveryEmail);
      setAlert({ type: "success", msg: data.message });
    } catch (err) {
      setAlert({ type: "error", msg: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Recovery email"
      subtitle="An alternate email that can also sign in, in case you lose access to your primary inbox."
    >
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Recovery email
        </label>
        <input
          value={recoveryEmail}
          onChange={(e) => setRecoveryEmail(e.target.value)}
          type="email"
          placeholder="backup@example.com"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <Button id="recovery-save-btn" onClick={save} loading={loading}>
        Save recovery email
      </Button>
      {alert && (
        <div className="mt-3">
          <InlineAlert type={alert.type} message={alert.msg} />
        </div>
      )}
      {recoveryEmail && recoveryEmail.toLowerCase() === primaryEmail.toLowerCase() && (
        <div className="mt-2 text-xs text-danger">
          Recovery email must be different from your primary login email.
        </div>
      )}
    </Card>
  );
}

function ChangePasswordCard() {
  const { token } = useAdminAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function save() {
    if (!token) return;
    if (!current || !next) {
      setAlert({ type: "error", msg: "Both passwords are required." });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const data = await adminApi.updatePassword(token, current, next);
      setAlert({ type: "success", msg: data.message });
      setCurrent("");
      setNext("");
    } catch (err) {
      setAlert({ type: "error", msg: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Change password">
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Current password
        </label>
        <PasswordInput id="cp-current" value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
          New password
        </label>
        <PasswordInput id="cp-new" value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <Button id="cp-save-btn" onClick={save} loading={loading}>
        Change password
      </Button>
      {alert && (
        <div className="mt-3">
          <InlineAlert type={alert.type} message={alert.msg} />
        </div>
      )}
    </Card>
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
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function save(next: boolean) {
    if (!token) return;
    setMaintenanceMode(next);
    setLoading(true);
    setAlert(null);
    try {
      const data = await adminApi.savePlatformConfig(token, { maintenance_mode: next });
      setAlert({ type: "success", msg: data.message });
    } catch (err) {
      setAlert({ type: "error", msg: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Platform configuration">
      <label className="flex items-center gap-2 text-sm text-text-2">
        <input
          type="checkbox"
          checked={maintenanceMode}
          disabled={loading}
          onChange={(e) => save(e.target.checked)}
        />
        Maintenance mode
      </label>
      {alert && (
        <div className="mt-3">
          <InlineAlert type={alert.type} message={alert.msg} />
        </div>
      )}
    </Card>
  );
}
