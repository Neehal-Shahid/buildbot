import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { adminApi, type AdminStore, type EmailLog, type SupportTicket } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { ApiError } from "../../../lib/api";
import { ConfirmActionModal } from "./ConfirmActionModal";

// Server-side limits from server/routes/admin.js (/admin/send-email and
// /admin/broadcast both reject beyond these), mirrored here so the input
// stops at the limit instead of failing the request after composing.
const SUBJECT_MAX = 150;
const MESSAGE_MAX = 2000;

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
  const [storesError, setStoresError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    adminApi
      .stores(token)
      .then((data) => setStores(data.stores))
      .catch((err) =>
        setStoresError(err instanceof ApiError ? err.message : "Could not load the store list."),
      );
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
      <SendToStoreCard stores={stores} storesError={storesError} />
    </div>
  );
}

function BroadcastCard() {
  const { token } = useAdminAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  // Emailing every active store on the platform is at least as
  // consequential as the disable/delete/DB-cleanup actions elsewhere in
  // this panel, which all confirm first — this used to send on a single
  // click with no second step.
  const [confirmSend, setConfirmSend] = useState(false);

  async function send() {
    if (!token) return;
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

  function handleSendClick() {
    if (!subject || !message) return setAlert({ msg: "Fill subject and message.", type: "error" });
    setConfirmSend(true);
  }

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h2>Broadcast Email</h2>
          {/* The backend targets every store whose plan_status isn't
              'disabled' — there is no audience filter to promise here. */}
          <div className="card-sub">Send a message to every active store</div>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="bc-audience">
          Target Audience
        </label>
        <select id="bc-audience" disabled title="Broadcasts always go to all active stores">
          <option>All active stores</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="bc-subject">
          Subject
        </label>
        <input
          id="bc-subject"
          type="text"
          value={subject}
          maxLength={SUBJECT_MAX}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject line"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="bc-message">
          Message
        </label>
        <textarea
          id="bc-message"
          value={message}
          maxLength={MESSAGE_MAX}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Your message…"
          style={textareaStyle}
        />
      </div>
      <button className="btn btn-primary" onClick={handleSendClick} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        {busy ? "Sending…" : "Send Broadcast"}
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />

      <ConfirmActionModal
        open={confirmSend}
        onClose={() => setConfirmSend(false)}
        onConfirm={async () => {
          setConfirmSend(false);
          await send();
        }}
        iconBg="var(--warning-bg)"
        iconColor="var(--warning)"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        }
        title="Send broadcast to every active store?"
        desc="This emails every active store on the platform right now — it can't be recalled once sent."
        detail={
          <>
            <strong>Subject:</strong> {subject}
          </>
        }
        confirmLabel="Send Broadcast"
        busyLabel="Sending…"
        confirmClass="btn btn-primary"
      />
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
      // The run returns a per-type tally; reporting it is the only way an
      // admin can tell a real send apart from an all-skipped no-op.
      const data = await adminApi.runDrip(token);
      const { onboarding = 0, skipped = 0, errors = [] } = data.results || {};
      const summary = `${onboarding} onboarding email${onboarding !== 1 ? "s" : ""} sent, ${skipped} skipped (already sent).`;
      setAlert({
        msg: errors.length ? `${summary} ${errors.length} failed: ${errors.join("; ")}` : summary,
        type: errors.length ? "error" : "success",
      });
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
        {busy ? "Running…" : "Run Drip Now"}
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function EmailLogCard() {
  const { token } = useAdminAuth();
  const [logs, setLogs] = useState<EmailLog[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await adminApi.emailLog(token, 80);
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the email log.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <div>
          <h2>Email Send Log</h2>
          <div className="card-sub">Automated drip deduplication audit — each type sends once per store</div>
        </div>
        <button className="btn btn-sm" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        {error && <div className="alert alert-error show">{error}</div>}
        {!logs && !error && !busy && "Click Refresh to load recent sends."}
        {logs?.length === 0 && !error && "No emails logged yet."}
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
const STATUS_LABELS: Record<SupportTicket["status"], string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function SupportTicketsCard() {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const data = await adminApi.supportTickets(token);
      setTickets(data.tickets);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load support tickets.");
    } finally {
      setBusy(false);
    }
  }

  // Loads on mount and re-checks every 30s so a store owner's follow-up
  // reply shows up without the admin having to remember to click Refresh —
  // this card previously only ever loaded when that button was clicked.
  useEffect(() => {
    load();
    const interval = setInterval(load, 30 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
          <div className="card-sub">Messages from store owners — reply here to email them back</div>
        </div>
        <button className="btn btn-sm" onClick={load} disabled={busy}>
          {busy ? "Loading…" : "Refresh"}
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>
        {error && <div className="alert alert-error show">{error}</div>}
        {!tickets && !error && "Loading…"}
        {tickets?.length === 0 && !error && "No support tickets."}
        {tickets?.map((t) => (
          <AdminTicketThread key={t.id} ticket={t} onUpdateStatus={updateStatus} onReplied={load} />
        ))}
      </div>
    </div>
  );
}

function AdminTicketThread({
  ticket,
  onUpdateStatus,
  onReplied,
}: {
  ticket: SupportTicket;
  onUpdateStatus: (id: string | number, status: SupportTicket["status"]) => void;
  onReplied: () => void;
}) {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const replies = ticket.replies || [];

  async function sendReply() {
    if (!token || !reply.trim()) return;
    setSending(true);
    try {
      const data = await adminApi.replyToTicket(token, ticket.id, reply.trim());
      if (data.success) {
        toast.success("Sent", "The store owner has been emailed your reply.");
        setReply("");
        onReplied();
      } else {
        toast.error("Could not send", data.error || "Please try again.");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not send the reply.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <strong style={{ color: "var(--text)" }}>{ticket.subject}</strong>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {replies.length > 0 && (
            <span style={{ fontSize: 11 }}>
              {replies.length} repl{replies.length === 1 ? "y" : "ies"}
            </span>
          )}
          <select
            value={ticket.status}
            aria-label={`Status for ticket: ${ticket.subject}`}
            onChange={(e) => onUpdateStatus(ticket.id, e.target.value as SupportTicket["status"])}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-sm" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "View & reply"}
          </button>
        </div>
      </div>
      {/* Without the sender and date an admin can't tell who raised
          the ticket, though the API returns both. */}
      <div style={{ marginTop: 2, color: "var(--dim)" }}>
        {ticket.store_name || ticket.store_id ? `${ticket.store_name || "Store"} (${ticket.store_id})` : "Unknown store"}
        {ticket.store_email ? ` — ${ticket.store_email}` : ""}
        {ticket.created_at ? ` — ${new Date(ticket.created_at).toLocaleString()}` : ""}
      </div>
      <p style={{ marginTop: 4 }}>{ticket.message}</p>

      {open && (
        <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: "2px solid var(--border)" }}>
          {replies.map((r) => (
            <div key={r.id} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: r.sender === "admin" ? "var(--accent)" : "var(--text-2)" }}>
                {r.sender === "admin" ? "You (BuildVolt Team)" : ticket.store_name || "Store owner"}
                {r.created_at && (
                  <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: 6 }}>
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                )}
              </div>
              <div style={{ whiteSpace: "pre-wrap", marginTop: 2 }}>{r.message}</div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={2}
              maxLength={MESSAGE_MAX}
              placeholder="Reply to this store owner…"
              style={{ ...textareaStyle, flex: 1, minWidth: 220 }}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              style={{ alignSelf: "flex-start" }}
            >
              {sending ? "Sending…" : "Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SendToStoreCard({ stores, storesError }: { stores: AdminStore[]; storesError: string | null }) {
  const { token } = useAdminAuth();
  const [storeId, setStoreId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function send() {
    if (!token) return;
    if (!storeId || !subject || !message) return setAlert({ msg: "Pick a store and fill subject/message.", type: "error" });
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
          <div className="card-sub">Choose a store and send them a custom email</div>
        </div>
      </div>
      {storesError && <div className="alert alert-error show">{storesError}</div>}
      <div className="form-group">
        <label className="form-label" htmlFor="ss-store">
          Select Store
        </label>
        <select id="ss-store" value={storeId} onChange={(e) => setStoreId(e.target.value)} style={{ width: "100%" }}>
          <option value="">Select a store…</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>
              {s.name} — {s.email}
            </option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="ss-subject">
          Subject
        </label>
        <input
          id="ss-subject"
          type="text"
          value={subject}
          maxLength={SUBJECT_MAX}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Email subject line"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="ss-message">
          Message
        </label>
        <textarea
          id="ss-message"
          value={message}
          maxLength={MESSAGE_MAX}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Your message to this store…"
          style={textareaStyle}
        />
      </div>
      <button className="btn btn-primary" onClick={send} disabled={busy} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13" />
          <path d="M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        {busy ? "Sending…" : "Send Email"}
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}
