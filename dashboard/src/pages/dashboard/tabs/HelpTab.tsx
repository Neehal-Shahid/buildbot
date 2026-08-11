import { useEffect, useState } from "react";
import { dashboardApi, type SupportTicket } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";

export default function HelpTab() {
  const { token } = useStoreAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);

  function loadTickets() {
    if (!token) return;
    dashboardApi.support.list(token).then((data) => setTickets(data.tickets));
  }

  useEffect(loadTickets, [token]);

  async function submit() {
    if (!token || !subject || !message) return setAlert({ msg: "Fill in both fields.", type: "error" });
    setBusy(true);
    try {
      const data = await dashboardApi.support.submit(token, subject, message);
      setAlert({ msg: data.message, type: "success" });
      setSubject("");
      setMessage("");
      loadTickets();
    } catch {
      setAlert({ msg: "Could not submit ticket.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="section-title">Contact Support</div>
      <div className="section-sub">Get help from the BuildVolt team — report issues, ask questions, or send feedback.</div>

      <div className="card">
        <h2>Contact Support</h2>
        <p style={{ marginBottom: 14 }}>Have a problem, complaint, or question? Send a message directly to the BuildVolt team.</p>
        <div className="form-group">
          <label className="form-label">Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief summary of your issue" maxLength={150} />
        </div>
        <div className="form-group">
          <label className="form-label">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={2000} placeholder="Describe your issue in detail…" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={submit} disabled={busy}>
          Submit support request
        </button>
        {alert && <div className={`alert alert-${alert.type} show`} style={{ marginTop: 12 }}>{alert.msg}</div>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Your support requests</h2>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {!tickets && "Loading…"}
          {tickets?.length === 0 && "No support requests yet."}
          {tickets?.map((t) => (
            <div key={t.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <strong style={{ color: "var(--text)" }}>{t.subject}</strong> — {t.status}
              <div>{t.message}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
