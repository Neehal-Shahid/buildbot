import { useEffect, useState } from "react";
import { dashboardApi, type AnalyticsStats } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "All time", days: 0 },
];

export default function AnalyticsTab() {
  const { token } = useStoreAuth();
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);

  useEffect(() => {
    if (!token) return;
    setStats(null);
    dashboardApi.analytics(token, days).then((data) => setStats(data.stats));
  }, [token, days]);

  const maxDaily = stats ? Math.max(1, ...stats.daily.map((d) => d.count)) : 1;
  const maxPurpose = stats ? Math.max(1, ...stats.byPurpose.map((p) => p.count)) : 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.days}
            variant={days === r.days ? "primary" : "secondary"}
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Recommendations</div>
          <div className="mt-1 text-2xl font-bold text-text">{stats ? stats.total.count : "—"}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Avg budget</div>
          <div className="mt-1 text-2xl font-bold text-text">
            {stats?.avgBudget.avg ? Math.round(stats.avgBudget.avg).toLocaleString() : "—"}
          </div>
        </Card>
      </div>

      <Card title="Daily activity">
        <div className="flex items-end gap-1.5" style={{ height: 120 }}>
          {stats?.daily
            .slice()
            .reverse()
            .map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                <div
                  className="w-full rounded-t bg-accent"
                  style={{ height: `${(d.count / maxDaily) * 100}%`, minHeight: 2 }}
                />
              </div>
            ))}
          {!stats && <div className="text-sm text-muted">Loading…</div>}
          {stats && stats.daily.length === 0 && <div className="text-sm text-muted">No data yet.</div>}
        </div>
      </Card>

      <Card title="Popular purposes">
        <div className="flex flex-col gap-2">
          {stats?.byPurpose.map((p) => (
            <div key={p.purpose} className="flex items-center gap-2 text-sm">
              <div className="w-24 shrink-0 text-text-2">{p.purpose}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${(p.count / maxPurpose) * 100}%` }}
                />
              </div>
              <div className="w-8 text-right text-text-2">{p.count}</div>
            </div>
          ))}
          {stats && stats.byPurpose.length === 0 && <div className="text-sm text-muted">No data yet.</div>}
        </div>
      </Card>
    </div>
  );
}
