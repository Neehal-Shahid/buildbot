import { useEffect, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Card } from "../../../components/ui/Card";

export default function AnalyticsTab() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<AdminStore[] | null>(null);

  useEffect(() => {
    if (!token) return;
    adminApi.overview(token).then((data) => setStores(data.stores));
  }, [token]);

  const sorted = stores
    ? [...stores].sort((a, b) => (b.rec_count || 0) - (a.rec_count || 0))
    : null;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">
          Total stores
        </div>
        <div className="mt-1 text-2xl font-bold text-text">
          {stores ? stores.length : "—"}
        </div>
      </Card>

      <Card title="Top stores by recommendation count">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted">
              <th className="pb-2">Name</th>
              <th className="pb-2">Recommendations</th>
            </tr>
          </thead>
          <tbody>
            {!sorted && (
              <tr>
                <td colSpan={2} className="py-4 text-center text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {sorted?.length === 0 && (
              <tr>
                <td colSpan={2} className="py-4 text-center text-muted">
                  No stores with recommendations yet.
                </td>
              </tr>
            )}
            {sorted?.slice(0, 8).map((s) => (
              <tr key={s.store_id} className="border-t border-border">
                <td className="py-2 font-semibold text-text">{s.name}</td>
                <td className="py-2 text-text-2">{s.rec_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
