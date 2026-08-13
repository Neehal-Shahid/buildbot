import { useEffect, useState } from "react";
import { dashboardApi, todayCount, type AnalyticsStats } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { ApiError } from "../../../lib/api";
import { hasChosenMode } from "../../../lib/storeMode";

export default function HomeTab({ onNavigate }: { onNavigate: (tab: "help" | "store" | "products" | "embed") => void }) {
  const { token, store } = useStoreAuth();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    dashboardApi
      .analytics(token, 0)
      .then((data) => {
        if (cancelled) return;
        setStats(data.stats);
        // productCount is the raw DB row `{ count }` — see productDB.getCount().
        setProductCount(data.productCount?.count ?? 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Could not load your dashboard stats.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const hasOrderMethod = !!(store?.wooConnected || store?.whatsappVerified);
  // "Live" means the widget can currently take orders: it needs an order
  // method AND widget_enabled — /store-config returns active:false when
  // widget_enabled is 0, no matter how the store is set up. That alone
  // doesn't mean the snippet was ever actually pasted anywhere though —
  // installed adds that real signal (see storeDB.touchWidgetSeen).
  const isLive = hasOrderMethod && store?.widgetEnabled !== false;
  const installed = !!store?.widgetLastSeen;
  const widgetStepDone = isLive && installed;
  const hasProducts = productCount > 0;
  const websiteChosen = hasChosenMode(store?.storeId);
  const launched = hasProducts && widgetStepDone;

  const today = todayCount(stats);
  // Don't render a confident "0" while the request is still in flight.
  const show = (value: number | string) => (loading ? "—" : value);

  return (
    <div>
      <div className="section-title">Dashboard</div>
      <div className="section-sub">Welcome back, {store?.name}! Here's what's happening with your store.</div>

      {error && (
        <div className="alert alert-error show" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

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
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate("help")} style={{ whiteSpace: "nowrap" }}>
            Contact Support
          </button>
        </div>
      </div>

      {/* Shown until the store is actually launched. Previously this whole
          block was hidden as soon as a product existed, which made step 3
          ("Publish widget") impossible to reach from here. */}
      {!loading && !launched && (
        <div>
          <div className="card" style={{ marginBottom: 16, background: "var(--accent-bg)", borderColor: "var(--accent)" }}>
            <h2 style={{ marginBottom: 8 }}>Welcome to BuildVolt</h2>
            <p>
              {hasProducts
                ? "Your catalog is ready — publish your widget to start getting build requests."
                : "You are a couple of steps away from activating your widget. Follow the journey below to go live."}
            </p>
          </div>

          <div className="journey-card" style={{ marginBottom: 16 }}>
            <h2 style={{ marginBottom: 8 }}>Getting Started Journey</h2>
            <p style={{ marginBottom: 12 }}>Complete the three steps to launch your assistant</p>
            <div className="journey-steps">
              <div className="journey-stepbox">
                <div className={`journey-num ${websiteChosen ? "done" : "pending"}`}>1</div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Step 1</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "2px 0 6px" }}>Choose website type</div>
                  <div style={{ fontSize: 11 }}>{websiteChosen ? "Done" : "Pending"}</div>
                  {!websiteChosen && (
                    <button type="button" className="btn btn-sm" onClick={() => onNavigate("store")} style={{ marginTop: 8 }}>
                      Continue
                    </button>
                  )}
                </div>
              </div>
              <div className="journey-stepbox">
                <div className={`journey-num ${hasProducts ? "done" : "pending"}`}>2</div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Step 2</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "2px 0 6px" }}>Add products</div>
                  <div style={{ fontSize: 11 }}>{hasProducts ? "Done" : "Pending"}</div>
                  {!hasProducts && (
                    <button type="button" className="btn btn-sm" onClick={() => onNavigate("products")} style={{ marginTop: 8 }}>
                      Continue
                    </button>
                  )}
                </div>
              </div>
              <div className="journey-stepbox">
                <div className={`journey-num ${widgetStepDone ? "done" : "pending"}`}>3</div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>Step 3</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", margin: "2px 0 6px" }}>Install &amp; publish widget</div>
                  <div style={{ fontSize: 11 }}>{widgetStepDone ? "Done" : "Pending"}</div>
                  {!widgetStepDone && (
                    <button type="button" className="btn btn-sm" onClick={() => onNavigate("embed")} style={{ marginTop: 8 }}>
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
          <div className="stat-value">{show(stats?.total.count ?? 0)}</div>
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
          <div className="stat-value">{show(productCount)}</div>
          <div className="stat-label">Products in Catalog</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="stat-value">
            {show(stats?.avgBudget.avg ? Math.round(stats.avgBudget.avg).toLocaleString() : 0)}
          </div>
          <div className="stat-label">Avg Customer Budget</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="stat-value">{show(today)}</div>
          <div className="stat-label">Recommendations Today</div>
        </div>
      </div>

      {launched && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "var(--success-bg)", border: "1px solid rgba(5,150,105,0.25)", borderRadius: 12, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--success)", marginBottom: 2 }}>Your widget is live</div>
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
            {loading && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center" }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && (!stats || stats.recent.length === 0) && (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)", textAlign: "center" }}>
                  {error ? "Could not load recent activity." : "No recommendations yet"}
                </td>
              </tr>
            )}
            {!loading &&
              stats?.recent.map((r, i) => (
                <tr key={`${r.created_at}-${i}`}>
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
