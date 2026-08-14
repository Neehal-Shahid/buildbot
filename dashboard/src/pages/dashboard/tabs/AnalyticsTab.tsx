import { useEffect, useState } from "react";
import { dashboardApi, todayCount, type AnalyticsStats } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { ApiError } from "../../../lib/api";

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "All time", days: 0 },
];

export default function AnalyticsTab() {
  const { token } = useStoreAuth();
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setStats(null);
    setLoading(true);
    setError(null);
    dashboardApi
      .analytics(token, days)
      .then((data) => {
        if (!cancelled) setStats(data.stats);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not load analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, days]);

  const today = todayCount(stats);
  const maxDaily = stats ? Math.max(1, ...stats.daily.map((d) => d.count)) : 1;
  const maxPurpose = stats ? Math.max(1, ...stats.byPurpose.map((p) => p.count)) : 1;
  // Was labelled "This Week" while actually summing stats.daily — which is
  // filtered by the *selected* range, so it just restated the "Total Builds
  // Suggested" card for the 7- and 30-day ranges. The busiest single day is
  // a genuinely different figure and is correct for every range.
  const busiestDay = stats && stats.daily.length ? Math.max(...stats.daily.map((d) => d.count)) : 0;

  const show = (value: number | string) => (loading ? "—" : value);
  const emptyText = loading ? "Loading…" : error ? "Could not load this data." : "No data yet.";

  return (
    <div>
      <div className="section-title">Analytics</div>
      <div className="section-sub">See how customers are using your BuildVolt widget.</div>

      {error && (
        <div className="alert alert-error show" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", flexWrap: "wrap" }}>
        {RANGES.map((r) => (
          <button
            type="button"
            key={r.days}
            className={`btn btn-sm${days === r.days ? " range-btn-active" : ""}`}
            aria-pressed={days === r.days}
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{show(stats?.total.count ?? 0)}</div>
          <div className="stat-label">Total Builds Suggested</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {show(stats?.avgBudget.avg ? Math.round(stats.avgBudget.avg).toLocaleString() : 0)}
          </div>
          <div className="stat-label">Avg Budget (PKR)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{show(today)}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{show(busiestDay)}</div>
          <div className="stat-label">Busiest Day</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h2>Popular Purposes</h2>
          <p style={{ marginBottom: 16 }}>What customers want to build most.</p>
          <div className="chart-bar-wrap">
            {!stats || stats.byPurpose.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>{emptyText}</p>
            ) : (
              stats.byPurpose.map((p) => (
                <div key={p.purpose} className="chart-row">
                  <div className="chart-label">{p.purpose}</div>
                  <div className="chart-bar-bg">
                    <div className="chart-bar-fill" style={{ width: `${(p.count / maxPurpose) * 100}%` }} />
                  </div>
                  <div className="chart-count">{p.count}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card">
          <h2>Daily Activity</h2>
          <p style={{ marginBottom: 16 }}>Recommendations per day.</p>
          <div className="chart-bar-wrap">
            {!stats || stats.daily.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>{emptyText}</p>
            ) : (
              stats.daily.map((d) => (
                <div key={d.day} className="chart-row">
                  <div className="chart-label">{d.day}</div>
                  <div className="chart-bar-bg">
                    <div className="chart-bar-fill" style={{ width: `${(d.count / maxDaily) * 100}%` }} />
                  </div>
                  <div className="chart-count">{d.count}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Recent Recommendations</h2>
        <table className={!stats || stats.recent.length === 0 ? "table-empty-state" : undefined}>
          <thead>
            <tr>
              <th>Budget</th>
              <th>Purpose</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {!stats || stats.recent.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", color: "var(--muted)" }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              stats.recent.map((r, i) => (
                <tr key={`${r.created_at}-${i}`}>
                  <td>{Number(r.budget).toLocaleString()}</td>
                  <td>{r.purpose}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
