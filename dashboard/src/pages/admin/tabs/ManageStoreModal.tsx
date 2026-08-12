import { useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { ApiError } from "../../../lib/api";

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
  // effectiveStatus is the backend's own normalized view of plan_status
  // (anything that isn't literally 'disabled' counts as active), so it is
  // guaranteed to match one of the two <option> values below — plan_status
  // itself could hold some other plan string and leave the select unmatched.
  const initialStatus = store?.effectiveStatus || "active";
  const [status, setStatus] = useState<string>(initialStatus);
  const [notes, setNotes] = useState(store?.admin_notes || "");
  const [dripPaused, setDripPaused] = useState(Number(store?.drip_emails_paused) === 1);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!store || !token) return;
    setSaving(true);
    try {
      // Only touch the status routes when the status actually changed:
      // /admin/disable-store also disconnects WooCommerce and emails the
      // store owner a "your store has been disabled" notice, so firing it
      // on every save meant editing notes on an already-disabled store
      // re-sent that email each time.
      if (status !== initialStatus) {
        // Server-side now logs this to the real audit log itself (see
        // adminAuditDB.log calls in server/routes/admin.js) — no
        // client-side logging needed.
        await adminApi[status === "disabled" ? "disableStore" : "activateStore"](token, store.store_id);
      }
      await adminApi.saveNotes(token, store.store_id, notes.trim());
      await adminApi.setDripPaused(token, store.store_id, dripPaused);
      toast.success("Store updated", "Changes saved successfully.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not update store.");
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
        <p>Change this store's status, pause its automated emails, or record internal notes.</p>
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
              <label className="form-label" htmlFor="manage-store-status">
                Status
              </label>
              <select
                id="manage-store-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: "100%" }}
              >
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
              <label className="form-label" htmlFor="manage-store-notes">
                Internal Admin Notes
              </label>
              <textarea
                id="manage-store-notes"
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
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <button className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
