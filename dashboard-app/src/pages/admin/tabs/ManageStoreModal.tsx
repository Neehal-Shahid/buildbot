import { useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { logActivity } from "../../../lib/activityLog";

export function ManageStoreModal({
  store,
  onClose,
  onSaved,
}: {
  store: AdminStore | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [status, setStatus] = useState(store?.plan_status || "active");
  const [notes, setNotes] = useState(store?.admin_notes || "");
  const [dripPaused, setDripPaused] = useState(
    String(store?.drip_emails_paused) === "1",
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!store || !token) return;
    setSaving(true);
    try {
      const statusRoute = status === "disabled" ? "disableStore" : "activateStore";
      await adminApi[statusRoute](token, store.store_id);
      await adminApi.saveNotes(token, store.store_id, notes.trim());
      await adminApi.setDripPaused(token, store.store_id, dripPaused);
      logActivity("Store status updated", `${store.store_id} → ${status}`);
      toast.success("Store updated", "Changes saved successfully.");
      onSaved();
      onClose();
    } catch {
      toast.error("Error", "Could not update store.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!store} onClose={onClose}>
      {store && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-text">Manage store</h3>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Store</div>
              <div className="font-semibold text-text">{store.name}</div>
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Email</div>
              <div className="font-semibold text-text">{store.email}</div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
              Admin notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text-2">
            <input
              type="checkbox"
              checked={dripPaused}
              onChange={(e) => setDripPaused(e.target.checked)}
            />
            Pause automated drip emails for this store
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save changes
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
