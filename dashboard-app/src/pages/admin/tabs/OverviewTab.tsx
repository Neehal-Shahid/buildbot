import { useEffect, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { Card } from "../../../components/ui/Card";
import { Spinner } from "../../../components/ui/Spinner";
import { StatusBadge } from "../../../components/StatusBadge";

export default function OverviewTab() {
  const { token } = useAdminAuth();
  const [stores, setStores] = useState<AdminStore[] | null>(null);
  const [totalRecs, setTotalRecs] = useState(0);

  useEffect(() => {
    if (!token) return;
    adminApi.overview(token).then((data) => {
      setStores(data.stores);
      setTotalRecs(data.totalRecs);
    });
  }, [token]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Total stores
          </div>
          <div className="mt-1 text-2xl font-bold text-text">
            {stores ? stores.length : "—"}
          </div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            Total recommendations
          </div>
          <div className="mt-1 text-2xl font-bold text-text">
            {stores ? totalRecs : "—"}
          </div>
        </Card>
      </div>

      <Card title="Recently joined stores">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Joined</th>
              </tr>
            </thead>
            <tbody>
              {!stores && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    <Spinner size={14} /> Loading…
                  </td>
                </tr>
              )}
              {stores?.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    No stores registered yet.
                  </td>
                </tr>
              )}
              {stores?.slice(0, 8).map((s) => (
                <tr key={s.store_id} className="border-t border-border">
                  <td className="py-2 font-semibold text-text">{s.name}</td>
                  <td className="py-2 text-text-2">{s.email}</td>
                  <td className="py-2">
                    <StatusBadge store={s} />
                  </td>
                  <td className="py-2 text-text-2">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
