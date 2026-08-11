import { useState } from "react";
import { adminApi } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

type AuditResult = Awaited<ReturnType<typeof adminApi.dbAudit>>;

export default function DbHealthTab() {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [running, setRunning] = useState(false);
  const [cleaning, setCleaning] = useState<"tokens" | "orphans" | null>(null);

  async function runAudit() {
    if (!token) return;
    setRunning(true);
    try {
      const data = await adminApi.dbAudit(token);
      setAudit(data);
    } catch {
      toast.error("Error", "Could not run DB audit.");
    } finally {
      setRunning(false);
    }
  }

  async function cleanup(action: "tokens" | "orphans") {
    if (!token) return;
    setCleaning(action);
    try {
      const data = await adminApi.dbCleanup(token, action);
      toast.success("Cleanup complete", data.message);
      if (audit) runAudit();
    } catch {
      toast.error("Error", "Cleanup failed.");
    } finally {
      setCleaning(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Database integrity audit">
        <Button onClick={runAudit} loading={running}>
          Run audit
        </Button>

        {audit && (
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(audit.counts).map(([table, count]) => (
                <div key={table} className="rounded-md border border-border p-2">
                  <div className="text-[11px] uppercase tracking-wide text-muted">{table}</div>
                  <div className="font-semibold text-text">{count}</div>
                </div>
              ))}
            </div>
            <div>
              Orphan products: <strong>{audit.orphans.products}</strong> · Orphan
              recommendations: <strong>{audit.orphans.recommendations}</strong>
            </div>
            <div>
              Expired tokens: <strong>{audit.tokens.expired}</strong> · Used tokens:{" "}
              <strong>{audit.tokens.used}</strong>
            </div>
            <ul className="list-disc pl-5 text-xs text-muted">
              {audit.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="Cleanup">
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => cleanup("tokens")} loading={cleaning === "tokens"}>
            Clean expired tokens
          </Button>
          <Button variant="secondary" onClick={() => cleanup("orphans")} loading={cleaning === "orphans"}>
            Clean orphaned records
          </Button>
        </div>
      </Card>
    </div>
  );
}
