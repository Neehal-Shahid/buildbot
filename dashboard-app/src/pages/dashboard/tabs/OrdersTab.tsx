import { useEffect, useState } from "react";
import { dashboardApi, type OrderRequest } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { Card } from "../../../components/ui/Card";

export default function OrdersTab() {
  const { token } = useStoreAuth();
  const [orders, setOrders] = useState<OrderRequest[] | null>(null);

  useEffect(() => {
    if (!token) return;
    dashboardApi.orderRequests(token).then((data) => setOrders(data.orders));
  }, [token]);

  return (
    <Card
      title="Order requests"
      subtitle="Builds customers clicked 'Order' on from the widget — cross-check against WhatsApp messages."
    >
      <div className="flex flex-col gap-3">
        {!orders && <div className="text-sm text-muted">Loading…</div>}
        {orders?.length === 0 && <div className="text-sm text-muted">No order requests yet.</div>}
        {orders?.map((o) => (
          <div key={o.id} className="rounded-md border border-border p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-text">
                Total: {o.total ? Number(o.total).toLocaleString() : "—"}
              </div>
              <div className="text-xs text-muted">
                {o.created_at ? new Date(o.created_at).toLocaleString() : ""}
              </div>
            </div>
            {o.parts ? (
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-text-2">
                {typeof o.parts === "string" ? o.parts : JSON.stringify(o.parts, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
