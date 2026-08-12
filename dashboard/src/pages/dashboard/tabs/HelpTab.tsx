import { useEffect, useState } from "react";
import { dashboardApi, type SupportTicket } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { ApiError } from "../../../lib/api";

// The four statuses an admin can set — see POST /admin/support-tickets/:id/status.
const STATUS_BADGE: Record<string, string> = {
  open: "badge-info",
  in_progress: "badge-warning",
  resolved: "badge-success",
  closed: "badge-success",
};

export default function HelpTab() {
  const { token } = useStoreAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  function loadTickets() {
    if (!token) return;
    setTicketsError(null);
    dashboardApi.support
      .list(token)
      .then((data) => setTickets(data.tickets))
      .catch((err) => {
        // Without this the list sat on "Loading…" forever.
        setTickets([]);
        setTicketsError(
          err instanceof ApiError ? err.message : "Could not load your past support requests.",
        );
      });
  }

  useEffect(loadTickets, [token]);

  async function submit() {
    if (!token) return;
    // Trim before validating: the server only rejects a *missing* subject,
    // so "   " would have been stored as an empty ticket subject.
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    if (!cleanSubject || !cleanMessage) {
      return setAlert({ msg: "Please fill in both the subject and the message.", type: "error" });
    }
    setBusy(true);
    setAlert(null);
    try {
      const data = await dashboardApi.support.submit(token, cleanSubject, cleanMessage);
      setAlert({ msg: data.message, type: "success" });
      setSubject("");
      setMessage("");
      loadTickets();
    } catch (err) {
      setAlert({
        msg: err instanceof ApiError ? err.message : "Could not submit your support request.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="section-title">Contact Support</div>
      <div className="section-sub">Get help from the BuildVolt team — report issues, ask questions, or send feedback.</div>

      <div className="card">
        <h2>Send us a message</h2>
        <p style={{ marginBottom: 14 }}>Have a problem, complaint, or question? Send a message directly to the BuildVolt team.</p>
        <div className="form-group">
          <label className="form-label" htmlFor="help-subject">
            Subject
          </label>
          <input
            id="help-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            maxLength={150}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="help-message">
            Message
          </label>
          <textarea
            id="help-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Describe your issue in detail…"
          />
        </div>
        <button
          type="button"
          className={`btn btn-primary btn-sm${busy ? " is-loading" : ""}`}
          onClick={submit}
          disabled={busy}
        >
          {busy ? "Sending…" : "Submit support request"}
        </button>
        {alert && <div className={`alert alert-${alert.type} show`} style={{ marginTop: 12 }}>{alert.msg}</div>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Your support requests</h2>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {!tickets && "Loading…"}
          {ticketsError && <div style={{ color: "var(--danger)" }}>{ticketsError}</div>}
          {tickets?.length === 0 && !ticketsError && "No support requests yet."}
          {tickets?.map((t) => (
            <div key={t.id} style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ color: "var(--text)" }}>{t.subject}</strong>
                <span className={`badge ${STATUS_BADGE[t.status] || "badge-info"}`}>
                  {String(t.status || "open").replace("_", " ")}
                </span>
                {t.created_at && (
                  <span style={{ fontSize: 11 }}>{new Date(t.created_at).toLocaleDateString()}</span>
                )}
              </div>
              <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{t.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
