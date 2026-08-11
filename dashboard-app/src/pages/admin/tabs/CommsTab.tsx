import { useEffect, useState } from "react";
import {
  adminApi,
  type AdminStore,
  type EmailLog,
  type SupportTicket,
} from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function CommsTab() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<AdminStore[]>([]);

  useEffect(() => {
    if (!token) return;
    adminApi.stores(token).then((data) => setStores(data.stores));
  }, [token]);

  return (
    <div className="flex flex-col gap-4">
      <SendToStoreCard stores={stores} />
      <BroadcastCard />
      <DripCard />
      <EmailLogCard />
      <SupportTicketsCard />
    </div>
  );
}

function SendToStoreCard({ stores }: { stores: AdminStore[] }) {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [storeId, setStoreId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!token || !storeId || !subject || !message) {
      toast.error("Missing fields", "Pick a store and fill subject/message.");
      return;
    }
    setSending(true);
    try {
      const data = await adminApi.sendEmail(token, storeId, subject, message);
      toast.success("Email sent", data.message);
      setSubject("");
      setMessage("");
    } catch {
      toast.error("Error", "Could not send email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card title="Send to specific store">
      <div className="mb-3">
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        >
          <option value="">Select a store…</option>
          {stores.map((s) => (
            <option key={s.store_id} value={s.store_id}>
              {s.name} — {s.email}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={150}
          placeholder="Subject"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div className="mb-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Message"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <Button onClick={send} loading={sending}>
        Send email
      </Button>
    </Card>
  );
}

function BroadcastCard() {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!token || !subject || !message) {
      toast.error("Missing fields", "Fill subject and message.");
      return;
    }
    setSending(true);
    try {
      const data = await adminApi.broadcast(token, subject, message);
      toast.success("Broadcast sent", data.message);
      setSubject("");
      setMessage("");
    } catch {
      toast.error("Error", "Broadcast failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card title="Broadcast email" subtitle="Sends to every active (non-disabled) store.">
      <div className="mb-3">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={150}
          placeholder="Subject"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div className="mb-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          placeholder="Message"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <Button onClick={send} loading={sending}>
        Broadcast to all stores
      </Button>
    </Card>
  );
}

function DripCard() {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [running, setRunning] = useState(false);

  async function run() {
    if (!token) return;
    setRunning(true);
    try {
      await adminApi.runDrip(token);
      toast.success("Drip run complete", "Automated onboarding emails processed.");
    } catch {
      toast.error("Error", "Drip run failed.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card
      title="Automated drip"
      subtitle="Manually trigger the scheduled onboarding nudge emails (normally run automatically)."
    >
      <Button variant="secondary" onClick={run} loading={running}>
        Run drip now
      </Button>
    </Card>
  );
}

function EmailLogCard() {
  const { token } = useAdminAuth();
  const [logs, setLogs] = useState<EmailLog[] | null>(null);

  function load() {
    if (!token) return;
    adminApi.emailLog(token, 80).then((data) => setLogs(data.logs));
  }

  useEffect(load, [token]);

  return (
    <Card title="Email send log">
      <Button variant="ghost" onClick={load} className="mb-3">
        Refresh
      </Button>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted">
              <th className="pb-2">Type</th>
              <th className="pb-2">Recipient</th>
              <th className="pb-2">Sent</th>
            </tr>
          </thead>
          <tbody>
            {!logs && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-muted">Loading…</td>
              </tr>
            )}
            {logs?.length === 0 && (
              <tr>
                <td colSpan={3} className="py-3 text-center text-muted">No emails logged yet.</td>
              </tr>
            )}
            {logs?.map((l) => (
              <tr key={l.id} className="border-t border-border">
                <td className="py-1.5">{l.email_type}</td>
                <td className="py-1.5">{l.recipient}</td>
                <td className="py-1.5">
                  {l.sent_at ? new Date(l.sent_at).toLocaleString() : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const STATUS_OPTIONS: SupportTicket["status"][] = [
  "open",
  "in_progress",
  "resolved",
  "closed",
];

function SupportTicketsCard() {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);

  function load() {
    if (!token) return;
    adminApi.supportTickets(token).then((data) => setTickets(data.tickets));
  }

  useEffect(load, [token]);

  async function updateStatus(id: string | number, status: SupportTicket["status"]) {
    if (!token) return;
    try {
      await adminApi.updateTicketStatus(token, id, status);
      toast.success("Ticket updated", "Status saved.");
      load();
    } catch {
      toast.error("Error", "Could not update ticket.");
    }
  }

  return (
    <Card title="Support tickets">
      <Button variant="ghost" onClick={load} className="mb-3">
        Refresh
      </Button>
      <div className="flex flex-col gap-3">
        {!tickets && <div className="text-sm text-muted">Loading…</div>}
        {tickets?.length === 0 && (
          <div className="text-sm text-muted">No support tickets.</div>
        )}
        {tickets?.map((t) => (
          <div key={t.id} className="rounded-md border border-border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-text">{t.subject}</div>
              <select
                value={t.status}
                onChange={(e) => updateStatus(t.id, e.target.value as SupportTicket["status"])}
                className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-text-2">{t.message}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
