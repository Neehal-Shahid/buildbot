import { useState } from "react";
import { clearActivityLog, getActivityLog } from "../../../lib/activityLog";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function ActivityTab() {
  const [log, setLog] = useState(getActivityLog());

  return (
    <Card
      title="Activity log"
      subtitle="Client-side only — records admin actions taken in this browser."
    >
      <Button
        variant="ghost"
        className="mb-3"
        onClick={() => {
          clearActivityLog();
          setLog([]);
        }}
      >
        Clear log
      </Button>
      <div className="flex flex-col gap-2">
        {log.length === 0 && <div className="text-sm text-muted">No activity recorded yet.</div>}
        {log.map((e, i) => (
          <div key={i} className="rounded-md border border-border p-2.5 text-sm">
            <div className="font-semibold text-text">{e.action}</div>
            <div className="text-xs text-muted">{e.detail}</div>
            <div className="mt-0.5 text-[11px] text-dim">
              {new Date(e.at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
