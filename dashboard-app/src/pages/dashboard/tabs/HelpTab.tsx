import { useEffect, useState } from "react";
import { dashboardApi, type SupportTicket } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function HelpTab() {
  const { token } = useStoreAuth();
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);

  function loadTickets() {
    if (!token) return;
    dashboardApi.support.list(token).then((data) => setTickets(data.tickets));
  }

  useEffect(loadTickets, [token]);

  async function submit() {
    if (!token || !subject || !message) {
      toast.error("Missing fields", "Fill in both subject and message.");
      return;
    }
    setSending(true);
    try {
      const data = await dashboardApi.support.submit(token, subject, message);
      toast.success("Sent", data.message);
      setSubject("");
      setMessage("");
      loadTickets();
    } catch {
      toast.error("Error", "Could not submit ticket.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Contact support">
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
            placeholder="How can we help?"
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
        </div>
        <Button onClick={submit} loading={sending}>
          Send message
        </Button>
      </Card>

      <Card title="Your tickets">
        <div className="flex flex-col gap-2">
          {!tickets && <div className="text-sm text-muted">Loading…</div>}
          {tickets?.length === 0 && <div className="text-sm text-muted">No tickets yet.</div>}
          {tickets?.map((t) => (
            <div key={t.id} className="rounded-md border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-text">{t.subject}</div>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">{t.status}</span>
              </div>
              <p className="mt-1 text-text-2">{t.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
