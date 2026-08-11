import { useEffect, useState } from "react";
import { dashboardApi, type AnalyticsStats } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";

export default function HomeTab({ onNavigate }: { onNavigate: (tab: "help" | "store" | "embed") => void }) {
  const { token, store } = useStoreAuth();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [productCount, setProductCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    dashboardApi.analytics(token, 0).then((data) => {
      setStats(data.stats);
      setProductCount(data.productCount);
    });
  }, [token]);

  const isLive = store?.wooConnected || store?.whatsappVerified;
  const hasProducts = productCount > 0;

  const today = new Date().toDateString();
  const todayCount = stats?.recent.filter((r) => new Date(r.created_at).toDateString() === today).length ?? 0;

  return (
    <div>
      <div className="section-title">Dashboard</div>
      <div className="section-sub">Welcome back, {store?.name}! Here's what's happening with your store.</div>

      <div
        className="card"
        style={{ marginBottom: 16, borderColor: "var(--accent-border)", background: "linear-gradient(135deg, var(--accent-light) 0%, var(--surface) 100%)" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ marginBottom: 6, fontSize: 16 }}>Need help or want to report an issue?</h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
              Contact our team directly from your dashboard — we typically respond within 24 hours.
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate("help")} style={{ whiteSpace: "nowrap" }}>
            Contact Support
          </button>
        </div>
      </div>

      {!hasProducts && (
        <div>
          <div className="card" style={{ marginBottom: 16, background: "var(--accent-bg)", borderColor: "var(--accent)" }}>
            <h2 style={{ marginBottom: 8 }}>Welcome to BuildVolt</h2>
            <p>You are one step away from activating your widget. Follow the journey below to go live.</p>
          </div>

          <div className="journey-card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 8 }}>Getting Started Journey</h2>
            <p style={{ marginBottom: 12 }}>Complete the three steps to launch your assistant</p>
            <div className="journey-steps">
              <div className="journey-stepbox">
                <div className="journey-num done">1</div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Step 1</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "2px 0 6px" }}>Store type selected</div>
                  <div style={{ fontSize: 11 }}>Done</div>
                </div>
              </div>
              <div className="journey-stepbox">
                <div className={`journey-num ${hasProducts ? "done" : "pending"}`}>2</div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Step 2</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "2px 0 6px" }}>Add product source</div>
                  <div style={{ fontSize: 11 }}>{hasProducts ? "Done" : "Pending"}</div>
                  {!hasProducts && (
                    <button className="btn btn-sm" onClick={() => onNavigate("store")} style={{ marginTop: 8 }}>
                      Continue
                    </button>
                  )}
                </div>
              </div>
              <div className="journey-stepbox">
                <div className={`journey-num ${isLive ? "done" : "pending"}`}>3</div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Step 3</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "2px 0 6px" }}>Publish widget</div>
                  <div style={{ fontSize: 11 }}>{isLive ? "Done" : "Pending"}</div>
                  {!isLive && (
                    <button className="btn btn-sm" onClick={() => onNavigate("embed")} style={{ marginTop: 8 }}>
                      Go Live
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="stat-value">{stats ? stats.total.count : 0}</div>
          <div className="stat-label">Total Recommendations</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div className="stat-value">{productCount}</div>
          <div className="stat-label">Products in Catalog</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-value">{stats?.avgBudget.avg ? Math.round(stats.avgBudget.avg).toLocaleString() : 0}</div>
          <div className="stat-label">Avg Customer Budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="stat-value">{todayCount}</div>
          <div className="stat-label">Recommendations Today</div>
        </div>
      </div>

      {isLive && hasProducts && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--success-bg)", border: "1px solid rgba(5,150,105,0.25)", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", marginBottom: 2 }}>Live widget detected</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>BuildVolt is active on your storefront.</div>
          </div>
          <div className="badge badge-success">Live</div>
        </div>
      )}

      <div className="card">
        <h2>Recent Activity</h2>
        <p style={{ marginBottom: 16 }}>Last 10 build recommendations made on your store.</p>
        <table>
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Budget</th>
              <th>Extras</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {(!stats || stats.recent.length === 0) && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center" }}>
                  No recommendations yet
                </td>
              </tr>
            )}
            {stats?.recent.map((r, i) => (
              <tr key={i}>
                <td>{r.purpose}</td>
                <td>{Number(r.budget).toLocaleString()}</td>
                <td>{r.extras || "—"}</td>
                <td>{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
