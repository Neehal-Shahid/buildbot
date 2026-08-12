import { useEffect, useState } from "react";
import { adminApi } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { ApiError } from "../../../lib/api";

interface Product {
  sku?: string;
  name?: string;
  price?: number;
  category?: string;
}

export function ProductsModal({
  store,
  onClose,
}: {
  store: { storeId: string; name: string } | null;
  onClose: () => void;
}) {
  const { token } = useAdminAuth();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!store || !token) return;
    setProducts(null);
    setError(null);
    adminApi
      .storeProducts(token, store.storeId)
      .then((data) => setProducts(data.products as Product[]))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load products."),
      );
  }, [store, token]);

  return (
    <div className={`modal-bg${store ? " open" : ""}`}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <h3>Product Catalog</h3>
        <p>All products for this store.</p>
        {store && (
          <div className="modal-detail">
            <strong>Store:</strong> {store.name}
            <br />
            <strong>Store ID:</strong> {store.storeId}

            {products === null && !error && (
              <div style={{ textAlign: "center", padding: 24, color: "var(--dim)", fontSize: 13 }}>Loading products…</div>
            )}
            {error && <div style={{ textAlign: "center", padding: 24, color: "var(--danger)", fontSize: 13 }}>{error}</div>}
            {products && products.length === 0 && (
              <div style={{ textAlign: "center", padding: 24, color: "var(--dim)", fontSize: 13 }}>No products found for this store.</div>
            )}
            {products && products.length > 0 && (
              <div style={{ maxHeight: 300, overflowY: "auto", overflowX: "auto", border: "1px solid var(--border)", borderRadius: 8, marginTop: 8 }}>
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 10px", background: "var(--surface-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>SKU</th>
                      <th style={{ padding: "8px 10px", background: "var(--surface-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Name</th>
                      <th style={{ padding: "8px 10px", background: "var(--surface-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Price</th>
                      <th style={{ padding: "8px 10px", background: "var(--surface-2)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>Category</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px 10px", fontSize: 12, fontFamily: "monospace" }}>{p.sku || ""}</td>
                        <td style={{ padding: "8px 10px", fontSize: 12 }}>{p.name || ""}</td>
                        {/* A genuinely free/zero-priced item must still
                            render as "Rs 0" rather than a blank cell. */}
                        <td style={{ padding: "8px 10px", fontSize: 12 }}>
                          {p.price == null ? "" : `Rs ${Number(p.price).toLocaleString()}`}
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 12 }}>{p.category || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        <div className="modal-btns">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
