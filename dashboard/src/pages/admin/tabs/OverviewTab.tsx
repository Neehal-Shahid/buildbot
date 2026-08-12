import { useEffect, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { StatusBadge } from "../../../components/StatusBadge";
import { ApiError } from "../../../lib/api";

export default function OverviewTab() {
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
        setLoadError(err instanceof ApiError ? err.message : "Could not load the platform overview."),
      );
  }, [token]);

  return (
    <div>
      <div className="section-title">Platform Overview</div>
      <div className="section-sub">Everything happening across BuildVolt right now.</div>
      {loadError && <div className="alert alert-error show">{loadError}</div>}

      <div className="stats">
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="stat-val">{stores ? stores.length : "—"}</div>
          <div className="stat-lbl">Total Stores</div>
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

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Recently Joined Stores</h2>
            <div className="card-sub">Newest store registrations</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Store</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {!stores && (
              <tr>
                <td colSpan={4} style={loadError ? { color: "var(--danger)" } : undefined}>
                  {loadError || "Loading…"}
                </td>
              </tr>
            )}
            {stores?.length === 0 && (
              <tr>
                <td colSpan={4}>No stores registered yet.</td>
              </tr>
            )}
            {stores?.slice(0, 8).map((s) => (
              <tr key={s.store_id}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td>{s.email}</td>
                <td>
                  <StatusBadge store={s} />
                </td>
                <td>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
