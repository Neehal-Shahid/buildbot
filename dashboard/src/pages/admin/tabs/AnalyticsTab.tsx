import { useEffect, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ApiError } from "../../../lib/api";

// ISO-week bucket key ("2026-W23") so the trend groups by calendar week
// regardless of which day of the week a store happened to sign up.
function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNo = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <div style={{ width: 90, fontSize: 12, color: "var(--muted)", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, background: "var(--surface-2)", borderRadius: 6, height: 14, overflow: "hidden" }}>
        <div style={{ width: `${max ? (count / max) * 100 : 0}%`, background: "var(--accent)", height: "100%" }} />
      </div>
      <div style={{ width: 28, fontSize: 12, color: "var(--text)", textAlign: "right", flexShrink: 0 }}>{count}</div>
    </div>
  );
}

export default function AnalyticsTab() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<AdminStore[] | null>(null);
  const [totalRecs, setTotalRecs] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    adminApi
      .overview(token)
      .then((data) => {
        setStores(data.stores);
        setTotalRecs(data.totalRecs);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Could not load platform analytics."),
      );
  }, [token]);

  const sorted = stores ? [...stores].sort((a, b) => (b.rec_count || 0) - (a.rec_count || 0)) : null;
  // The card is labelled "Active Stores", so it has to exclude the ones an
  // admin has disabled rather than reporting the full registered count.
  const activeCount = stores ? stores.filter((s) => s.effectiveStatus === "active").length : null;

  // Active, has a catalog, but has never generated a single recommendation
  // — the widget is technically live and reachable, customers just aren't
  // using it. Different problem from "stuck in onboarding" (Overview tab,
  // which is product_count === 0); this is "installed but not working /
  // not being found."
  const zeroEngagement = (stores || []).filter(
    (s) => s.effectiveStatus === "active" && (s.product_count || 0) > 0 && (s.rec_count || 0) === 0,
  );

  // Last 8 calendar weeks of signups, oldest first, computed entirely from
  // created_at already present on every store row — no extra backend call.
  const weekly = (() => {
    if (!stores) return [];
    const counts = new Map<string, number>();
    for (const s of stores) {
      if (!s.created_at) continue;
      const key = isoWeekKey(s.created_at);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  })();
  const maxWeekly = Math.max(1, ...weekly.map(([, c]) => c));

  return (
    <div>
      <div className="section-title">Platform Stats</div>
      <div className="section-sub">Trends and engagement across all BuildVolt stores.</div>
      {loadError && <div className="alert alert-error show">{loadError}</div>}
      <div className="stats">
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </div>
          <div className="stat-val">{activeCount ?? "—"}</div>
          <div className="stat-lbl">Active Stores</div>
        </div>
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="stat-val">{stores ? totalRecs : "—"}</div>
          <div className="stat-lbl">Total Recommendations</div>
        </div>
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
          </div>
          <div className="stat-val">{stores ? zeroEngagement.length : "—"}</div>
          <div className="stat-lbl">Live but Unused</div>
        </div>
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Top Stores</h2>
              <div className="card-sub">By recommendation count</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Recommendations</th>
              </tr>
            </thead>
            <tbody>
              {!sorted && (
                <tr>
                  <td colSpan={2} style={loadError ? { color: "var(--danger)" } : undefined}>
                    {loadError || "Loading…"}
                  </td>
                </tr>
              )}
              {sorted?.length === 0 && (
                <tr>
                  <td colSpan={2}>No stores registered yet.</td>
                </tr>
              )}
              {sorted?.slice(0, 8).map((s) => (
                <tr key={s.store_id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.rec_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Signups per Week</h2>
              <div className="card-sub">Last 8 weeks</div>
            </div>
          </div>
          {!stores && <div style={{ fontSize: 12, color: "var(--muted)" }}>{loadError || "Loading…"}</div>}
          {stores && weekly.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>No signups yet.</div>
          )}
          {weekly.map(([week, count]) => (
            <Bar key={week} label={week} count={count} max={maxWeekly} />
          ))}
        </div>
      </div>

      {stores && zeroEngagement.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-head">
            <div>
              <h2>Live but Unused</h2>
              <div className="card-sub">Active, with products, but zero recommendations ever — the widget may not be installed correctly</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Email</th>
                <th>Products</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {zeroEngagement.map((s) => (
                <tr key={s.store_id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.email}</td>
                  <td>{s.product_count || 0}</td>
                  <td>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
