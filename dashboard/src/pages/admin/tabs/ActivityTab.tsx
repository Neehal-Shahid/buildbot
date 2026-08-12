import { useEffect, useState } from "react";
import { adminApi, type AuditLogEntry } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ApiError } from "../../../lib/api";

export default function ActivityTab() {
  const { token } = useAdminAuth();
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!token) return;
    setBusy(true);
    setError(null);
    adminApi
      .auditLog(token, 200)
      .then((data) => setEntries(data.entries))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the activity log."))
      .finally(() => setBusy(false));
  }

  useEffect(load, [token]);

  return (
    <div>
      <div className="section-title">Activity Log</div>
      <div className="section-sub">
        A real, server-side record of admin actions — store enable/disable/delete, platform config changes, and
        database cleanups. Shared across every admin and every device, and can't be cleared from here.
      </div>
      <div className="card">
        <div className="card-head">
          <div>
            <h2>Recent Actions</h2>
            <div className="card-sub">
              {entries ? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}` : "Loading…"}
            </div>
          </div>
          <button className="btn btn-sm" onClick={load} disabled={busy}>
            {busy ? "Loading…" : "Refresh"}
          </button>
        </div>
        {error && <div className="alert alert-error show">{error}</div>}
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {!entries && !error && (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            )}
            {entries?.length === 0 && (
              <tr>
                <td colSpan={5}>No activity recorded yet.</td>
              </tr>
            )}
            {entries?.map((e) => (
              <tr key={e.id}>
                <td style={{ whiteSpace: "nowrap" }}>{e.created_at ? new Date(e.created_at).toLocaleString() : ""}</td>
                <td>{e.admin_email}</td>
                <td>{e.action}</td>
                <td>{e.target || "—"}</td>
                <td>{e.details || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
