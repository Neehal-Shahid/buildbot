import { useEffect, useState } from "react";
import { dashboardApi, type OrderRequest } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";

export default function OrdersTab() {
  const { token } = useStoreAuth();
  const [orders, setOrders] = useState<OrderRequest[] | null>(null);

  useEffect(() => {
    if (!token) return;
    dashboardApi.orderRequests(token).then((data) => setOrders(data.orders));
  }, [token]);

  return (
    <div>
      <div className="section-title">Order Requests</div>
      <div className="section-sub" style={{ marginBottom: 20 }}>
        Every time a customer clicks "Order This Build" in your widget, the real build (parts and total price,
        computed fresh from your catalog) is saved here — use it to cross-check against any order message a
        customer sends you, in case they edited it before sending.
      </div>

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Parts</th>
                <th>Total (Real)</th>
              </tr>
            </thead>
            <tbody>
              {!orders && (
                <tr>
                  <td colSpan={3} style={{ padding: 40, textAlign: "center" }}>
                    Loading order requests...
                  </td>
                </tr>
              )}
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 40, textAlign: "center" }}>
                    No order requests yet.
                  </td>
                </tr>
              )}
              {orders?.map((o) => (
                <tr key={o.id}>
                  <td>{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</td>
                  <td style={{ fontSize: 12 }}>
                    {o.parts ? (typeof o.parts === "string" ? o.parts : JSON.stringify(o.parts)) : "—"}
                  </td>
                  <td style={{ textAlign: "right" }}>{o.total ? Number(o.total).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
