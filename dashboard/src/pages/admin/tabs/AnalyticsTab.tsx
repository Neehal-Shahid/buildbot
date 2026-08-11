import { useEffect, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";

export default function AnalyticsTab() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<AdminStore[] | null>(null);

  useEffect(() => {
    if (!token) return;
    adminApi.overview(token).then((data) => setStores(data.stores));
  }, [token]);

  const sorted = stores ? [...stores].sort((a, b) => (b.rec_count || 0) - (a.rec_count || 0)) : null;

  return (
    <div>
      <div className="section-title">Platform Analytics</div>
      <div className="section-sub">Overall performance across all BuildVolt stores.</div>
      <div className="stats">
        <div className="stat">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </div>
          <div className="stat-val">{stores ? stores.length : "—"}</div>
          <div className="stat-lbl">Active Stores</div>
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
                  <td colSpan={2}>Loading…</td>
                </tr>
              )}
              {sorted?.length === 0 && (
                <tr>
                  <td colSpan={2}>No stores with recommendations yet.</td>
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
