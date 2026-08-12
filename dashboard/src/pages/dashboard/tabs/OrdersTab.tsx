import { useEffect, useState } from "react";
import { dashboardApi, type OrderPart, type OrderRequest } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { ApiError } from "../../../lib/api";

function PartsList({ parts }: { parts?: OrderPart[] }) {
  if (!Array.isArray(parts) || parts.length === 0) return <>—</>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {parts.map((p, i) => (
        <div key={`${p.category}-${i}`} style={{ lineHeight: 1.45 }}>
          <span style={{ color: "var(--muted)" }}>{p.category}:</span> {p.name}
          {p.quantity > 1 ? ` ×${p.quantity}` : ""}
          {Number.isFinite(p.totalPrice) && (
            <span style={{ color: "var(--muted)" }}> — {Number(p.totalPrice).toLocaleString()}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function OrdersTab() {
  const { token } = useStoreAuth();
  const [orders, setOrders] = useState<OrderRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setError(null);
    dashboardApi
      .orderRequests(token)
      .then((data) => {
        if (!cancelled) setOrders(data.orders);
      })
      .catch((err) => {
        if (cancelled) return;
        setOrders([]);
        setError(
          err instanceof ApiError ? err.message : "Could not load your order requests.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div>
      <div className="section-title">Order Requests</div>
      <div className="section-sub" style={{ marginBottom: 20 }}>
        Every time a customer clicks "Order This Build" in your widget, the real build (parts and total price,
        computed fresh from your catalog) is saved here — use it to cross-check against any order message a
        customer sends you, in case they edited it before sending.
      </div>

      {error && (
        <div className="alert alert-error show" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card">
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Build</th>
                <th>Parts</th>
                <th>Ordered via</th>
                <th style={{ textAlign: "right" }}>Total (Real)</th>
              </tr>
            </thead>
            <tbody>
              {!orders && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: "center" }}>
                    Loading order requests…
                  </td>
                </tr>
              )}
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
                    {error ? "No order requests could be loaded." : "No order requests yet."}
                  </td>
                </tr>
              )}
              {orders?.map((o) => (
                <tr key={o.id}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {o.created_at ? new Date(o.created_at).toLocaleString() : "—"}
                  </td>
                  <td>
                    {o.build_name || "—"}
                    {o.tier && (
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{o.tier}</div>
                    )}
                  </td>
                  <td style={{ fontSize: 12, minWidth: 240 }}>
                    <PartsList parts={o.parts} />
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {o.order_method === "woo" ? "WooCommerce cart" : "WhatsApp"}
                  </td>
                  {/* The column is total_price in order_requests — reading
                      o.total here rendered "—" on every single row. */}
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {Number.isFinite(Number(o.total_price))
                      ? `${o.currency || "PKR"} ${Number(o.total_price).toLocaleString()}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
