import { useEffect, useState } from "react";
import { dashboardApi, type AnalyticsStats } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function HomeTab({ onNavigate }: { onNavigate: (tab: "products" | "store") => void }) {
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-lg font-bold text-text">
          Welcome back, {store?.name}!
        </h1>
        <p className="text-sm text-muted">Here's what's happening with your store.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Recommendations</div>
          <div className="mt-1 text-2xl font-bold text-text">{stats ? stats.total.count : "—"}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Products</div>
          <div id="stat-products" className="mt-1 text-2xl font-bold text-text">
            {stats ? productCount : "—"}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Avg budget</div>
          <div className="mt-1 text-2xl font-bold text-text">
            {stats?.avgBudget.avg ? Math.round(stats.avgBudget.avg).toLocaleString() : "—"}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Widget status</div>
          <div className="mt-1 text-2xl font-bold text-text">
            {store?.wooConnected || store?.whatsappVerified ? "Ready" : "Not ready"}
          </div>
        </Card>
      </div>

      {productCount === 0 && (
        <Card>
          <div className="flex flex-col items-start gap-2">
            <div className="font-semibold text-text">Add your first products</div>
            <p className="text-sm text-muted">
              Your catalog is empty — add products manually or connect WooCommerce to start
              getting recommendations.
            </p>
            <Button onClick={() => onNavigate("store")}>Go to Store & Sync</Button>
          </div>
        </Card>
      )}

      <Card title="Recent activity">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th className="pb-2">Budget</th>
              <th className="pb-2">Purpose</th>
              <th className="pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {!stats && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {stats?.recent.length === 0 && (
              <tr>
                <td colSpan={3} className="py-4 text-center text-muted">
                  No recommendations yet.
                </td>
              </tr>
            )}
            {stats?.recent.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2 text-text">{Number(r.budget).toLocaleString()}</td>
                <td className="py-2 text-text-2">{r.purpose}</td>
                <td className="py-2 text-text-2">{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
