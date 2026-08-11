import { useState } from "react";
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
  const [dripPaused, setDripPaused] = useState(String(store?.drip_emails_paused) === "1");
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
    <div className={`modal-bg${store ? " open" : ""}`}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-icon" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 9.96l4.24 4.24M1.54 14.04l4.24-4.24M18.46 14.04l-4.24-4.24" />
          </svg>
        </div>
        <h3>Manage Store</h3>
        <p>Change store status, or send a manual email to this store.</p>
        {store && (
          <>
            <div className="modal-detail">
              <strong>Store:</strong> {store.name}
              <br />
              <strong>Email:</strong> {store.email}
              <br />
              <strong>Store ID:</strong> {store.store_id}
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "100%" }}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text)" }}>
                <input type="checkbox" checked={dripPaused} onChange={(e) => setDripPaused(e.target.checked)} />
                Pause automated drip emails for this store
              </label>
            </div>
            <div className="form-group">
              <label className="form-label">Internal Admin Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Internal notes about this store (not visible to store)"
                style={{ width: "100%", fontFamily: "system-ui, sans-serif", fontSize: 13, resize: "vertical" }}
              />
            </div>
          </>
        )}
        <div className="modal-btns">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            Save Changes
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
