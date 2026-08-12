import { useEffect, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ApiError } from "../../../lib/api";

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

  return (
    <div>
      <div className="section-title">Platform Analytics</div>
      <div className="section-sub">Overall performance across all BuildVolt stores.</div>
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
      </div>
    </div>
  );
}
