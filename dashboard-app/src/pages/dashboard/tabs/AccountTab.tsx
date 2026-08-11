import { useState } from "react";
import { dashboardApi } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { ApiError } from "../../../lib/api";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { InlineAlert } from "../../../components/ui/InlineAlert";
import { PasswordInput } from "../../../components/ui/PasswordInput";

export default function AccountTab() {
  const { store } = useStoreAuth();
  return (
    <div className="flex flex-col gap-4">
      <Card title="Store">
        <div className="text-sm text-text-2">
          <div>
            <strong className="text-text">{store?.name}</strong>
          </div>
          <div>{store?.email}</div>
          <div className="font-mono text-xs text-muted">{store?.storeId}</div>
        </div>
      </Card>
      <ChangePasswordCard />
      <EmailPreferencesCard />
      <DangerZoneCard />
    </div>
  );
}

function ChangePasswordCard() {
  const { token } = useStoreAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function save() {
    if (!token || !current || !next) {
      setAlert({ type: "error", msg: "Both passwords are required." });
      return;
    }
    setLoading(true);
    setAlert(null);
    try {
      const data = await dashboardApi.changePassword(token, current, next);
      if (data.success) {
        setAlert({ type: "success", msg: data.message });
        setCurrent("");
        setNext("");
      } else {
        setAlert({ type: "error", msg: data.error || "Something went wrong." });
      }
    } catch (err) {
      setAlert({ type: "error", msg: err instanceof ApiError ? err.message : "Connection error." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Change password">
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Current password
        </label>
        <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">
          New password
        </label>
        <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} />
      </div>
      <Button onClick={save} loading={loading}>
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

function EmailPreferencesCard() {
  const { token, store, refresh } = useStoreAuth();
  const toast = useToast();
  const [enabled, setEnabled] = useState(store?.marketingEmailsEnabled ?? true);
  const [loading, setLoading] = useState(false);

  async function toggle(next: boolean) {
    if (!token) return;
    setLoading(true);
    try {
      const data = await dashboardApi.emailPreferences(token, next);
      setEnabled(next);
      toast.success("Saved", data.message);
      refresh();
    } catch {
      toast.error("Error", "Could not update preference.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Email preferences">
      <label className="flex items-center gap-2 text-sm text-text-2">
        <input type="checkbox" checked={enabled} disabled={loading} onChange={(e) => toggle(e.target.checked)} />
        Receive marketing emails
      </label>
    </Card>
  );
}

function DangerZoneCard() {
  const { token, store, logout } = useStoreAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [confirmText, setConfirmText] = useState("");

  async function deleteAccount() {
    const ok = await confirm({
      title: "Delete your account?",
      desc: "This permanently removes your store, products, and all data. This cannot be undone.",
      okText: "Delete account",
      variant: "danger",
      body: (
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">
            Type your Store ID to confirm: {store?.storeId}
          </label>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
        </div>
      ),
    });
    if (!ok || !token) return;
    if (confirmText !== store?.storeId) {
      toast.error("Store ID didn't match", "Account was not deleted.");
      return;
    }
    try {
      await dashboardApi.deleteAccount(token);
      toast.success("Account deleted", "");
      logout();
    } catch {
      toast.error("Error", "Could not delete account.");
    }
  }

  return (
    <Card title="Danger zone">
      <p className="mb-3 text-sm text-muted">
        Permanently delete your account and all associated data.
      </p>
      <Button variant="danger" onClick={deleteAccount}>
        Delete account
      </Button>
    </Card>
  );
}
