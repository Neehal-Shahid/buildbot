import { useEffect, useState } from "react";
import { dashboardApi, type AnalyticsStats } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";

const RANGES = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
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

  const today = new Date().toDateString();
  const todayCount = stats?.recent.filter((r) => new Date(r.created_at).toDateString() === today).length ?? 0;
  const maxDaily = stats ? Math.max(1, ...stats.daily.map((d) => d.count)) : 1;
  const maxPurpose = stats ? Math.max(1, ...stats.byPurpose.map((p) => p.count)) : 1;

  return (
    <div>
      <div className="section-title">Analytics</div>
      <div className="section-sub">See how customers are using your BuildVolt widget.</div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0", flexWrap: "wrap" }}>
        {RANGES.map((r) => (
          <button
            key={r.days}
            className={`btn btn-sm${days === r.days ? " range-btn-active" : ""}`}
            onClick={() => setDays(r.days)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{stats ? stats.total.count : 0}</div>
          <div className="stat-label">Total Builds Suggested</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.avgBudget.avg ? Math.round(stats.avgBudget.avg).toLocaleString() : 0}</div>
          <div className="stat-label">Avg Budget (PKR)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{todayCount}</div>
          <div className="stat-label">Today</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats?.daily.reduce((s, d) => s + d.count, 0) ?? 0}</div>
          <div className="stat-label">This Week</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <h2>Popular Purposes</h2>
          <p style={{ marginBottom: 16 }}>What customers want to build most.</p>
          <div className="chart-bar-wrap">
            {!stats || stats.byPurpose.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No data yet.</p>
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
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No data yet.</p>
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
        <table>
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
                  No data yet.
                </td>
              </tr>
            ) : (
              stats.recent.map((r, i) => (
                <tr key={i}>
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
