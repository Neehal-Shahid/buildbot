import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { adminApi, type AdminStore, type EmailLog, type SupportTicket } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { ApiError } from "../../../lib/api";

const textareaStyle: CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--surface)",
  border: "1px solid var(--border-2)",
  borderRadius: "var(--r-md)",
  color: "var(--text)",
  fontSize: 13,
  resize: "vertical",
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

function Alert({ msg, type }: { msg: string | null; type: "success" | "error" | null }) {
  if (!msg) return null;
  return <div className={`alert alert-${type} show`} style={{ marginTop: 12 }}>{msg}</div>;
}

export default function CommsTab() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<AdminStore[]>([]);

  useEffect(() => {
    if (!token) return;
    adminApi.stores(token).then((data) => setStores(data.stores));
  }, [token]);

  return (
    <div>
      <div className="section-title">Communications</div>
      <div className="section-sub">Send emails to stores — broadcast announcements or trigger automated drip emails.</div>

      <div className="two-col">
        <BroadcastCard />
        <DripCard />
      </div>

      <EmailLogCard />
      <SupportTicketsCard />
      <SendToStoreCard stores={stores} />
    </div>
  );
}

function BroadcastCard() {
  const { token } = useAdminAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function send() {
    if (!token || !subject || !message) return setAlert({ msg: "Fill subject and message.", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.broadcast(token, subject, message);
      setAlert({ msg: data.message, type: "success" });
      setSubject("");
      setMessage("");
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Broadcast failed.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Broadcast Email</h2>
          <div className="card-sub">Send a message to all or filtered stores</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Target Audience</label>
        <select disabled>
          <option>All active stores</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Subject</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line" />
      </div>
      <div className="form-group">
        <label className="form-label">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} placeholder="Your message…" style={textareaStyle} />
      </div>
      <button className="btn btn-primary" onClick={send} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        Send Broadcast
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function DripCard() {
  const { token } = useAdminAuth();
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function run() {
    if (!token) return;
    setBusy(true);
    try {
      await adminApi.runDrip(token);
      setAlert({ msg: "Automated onboarding emails processed.", type: "success" });
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Drip run failed.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Automated Drip</h2>
          <div className="card-sub">Runs every hour automatically on the server</div>
        </div>
      </div>
      <div style={{ padding: "14px 16px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-md)", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>Sends automatically when conditions are met:</div>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 2.1 }}>
          <div>— Signed up 4 days ago, not live → setup nudge</div>
        </div>
      </div>
      <div style={{ padding: "12px 14px", background: "var(--warning-bg)", border: "1px solid var(--warning-border)", borderRadius: "var(--r-md)", marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--warning)", lineHeight: 1.6 }}>
          Run manually only to catch up after downtime or to test the system.
        </div>
      </div>
      <button className="btn btn-warning" onClick={run} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        Run Drip Now
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function EmailLogCard() {
  const { token } = useAdminAuth();
  const [logs, setLogs] = useState<EmailLog[] | null>(null);

  function load() {
    if (!token) return;
    adminApi.emailLog(token, 80).then((data) => setLogs(data.logs));
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <div>
          <h2>Email Send Log</h2>
          <div className="card-sub">Automated drip deduplication audit — each type sends once per store</div>
        </div>
        <button className="btn btn-sm" onClick={load}>
          Refresh
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        {!logs && "Click Refresh to load recent sends."}
        {logs?.length === 0 && "No emails logged yet."}
        {logs && logs.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Recipient</th>
                <th>Sent</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.email_type}</td>
                  <td>{l.recipient}</td>
                  <td>{l.sent_at ? new Date(l.sent_at).toLocaleString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const STATUS_OPTIONS: SupportTicket["status"][] = ["open", "in_progress", "resolved", "closed"];

function SupportTicketsCard() {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);

  function load() {
    if (!token) return;
    adminApi.supportTickets(token).then((data) => setTickets(data.tickets));
  }

  async function updateStatus(id: string | number, status: SupportTicket["status"]) {
    if (!token) return;
    try {
      await adminApi.updateTicketStatus(token, id, status);
      toast.success("Ticket updated", "Status saved.");
      load();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not update ticket.");
    }
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <div>
          <h2>Support Tickets</h2>
          <div className="card-sub">Messages from store owners</div>
        </div>
        <button className="btn btn-sm" onClick={load}>
          Refresh
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        {!tickets && "Click Refresh to load tickets."}
        {tickets?.length === 0 && "No support tickets."}
        {tickets?.map((t) => (
          <div key={t.id} style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ color: "var(--text)" }}>{t.subject}</strong>
              <select value={t.status} onChange={(e) => updateStatus(t.id, e.target.value as SupportTicket["status"])}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <p style={{ marginTop: 4 }}>{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SendToStoreCard({ stores }: { stores: AdminStore[] }) {
  const { token } = useAdminAuth();
  const [storeId, setStoreId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function send() {
    if (!token || !storeId || !subject || !message) return setAlert({ msg: "Pick a store and fill subject/message.", type: "error" });
    setBusy(true);
    try {
      const data = await adminApi.sendEmail(token, storeId, subject, message);
      setAlert({ msg: data.message, type: "success" });
      setSubject("");
      setMessage("");
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Could not send email.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <div>
          <h2>Send to Specific Store</h2>
          <div className="card-sub">Search for a store and send them a custom email</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Select Store</label>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)} style={{ width: "100%" }}>
          <option value="">Search or select a store…</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>
              {s.name} — {s.email}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Subject</label>
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line" />
      </div>
      <div className="form-group">
        <label className="form-label">Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Your message to this store…" style={textareaStyle} />
      </div>
      <button className="btn btn-primary" onClick={send} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        Send Email
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}
