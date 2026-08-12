import { useState } from "react";
import { clearActivityLog, getActivityLog } from "../../../lib/activityLog";
import { ConfirmActionModal } from "./ConfirmActionModal";

export default function ActivityTab() {
  const [log, setLog] = useState(getActivityLog());
  const [confirmClear, setConfirmClear] = useState(false);

  async function doClear() {
    clearActivityLog();
    setLog([]);
    setConfirmClear(false);
  }

  return (
    <div>
      <div className="section-title">Activity Log</div>
      <div className="section-sub">A local record of admin actions taken in this browser. Stored in localStorage — not sent to the server.</div>
      <div className="card">
        <div className="card-head">
          <div>
            <h2>Recent Actions</h2>
            <div className="card-sub">
              {log.length} {log.length === 1 ? "entry" : "entries"}
            </div>
          </div>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => setConfirmClear(true)}
            disabled={log.length === 0}
            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Clear Log
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && (
              <tr>
                <td colSpan={3}>No activity recorded yet.</td>
              </tr>
            )}
            {log.map((e, i) => (
              <tr key={i}>
                <td>{new Date(e.at).toLocaleString()}</td>
                <td>{e.action}</td>
                <td>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmActionModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={doClear}
        iconBg="var(--danger-bg)"
        iconColor="var(--danger)"
        icon={
          <svg viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4" />
          </svg>
        }
        title="Clear Activity Log"
        desc="This erases the locally stored record of admin actions in this browser. It cannot be undone."
        detail={
          <>
            <strong>Entries to remove:</strong> {log.length}
          </>
        }
        confirmLabel="Clear Log"
        busyLabel="Clearing…"
        confirmClass="btn btn-danger"
      />
    </div>
  );
}
