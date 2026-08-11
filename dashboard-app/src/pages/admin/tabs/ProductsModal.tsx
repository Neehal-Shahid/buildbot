import { useEffect, useState } from "react";
import { Modal } from "../../../components/ui/Modal";
import { adminApi } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";

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
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!store || !token) return;
    setProducts(null);
    setError(false);
    adminApi
      .storeProducts(token, store.storeId)
      .then((data) => setProducts(data.products as Product[]))
      .catch(() => setError(true));
  }, [store, token]);

  return (
    <Modal open={!!store} onClose={onClose}>
      {store && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-text">Product catalog</h3>
          <div className="text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Store</div>
            <div className="font-semibold text-text">{store.name}</div>
          </div>

          {products === null && !error && (
            <div className="py-6 text-center text-sm text-dim">Loading products…</div>
          )}
          {error && (
            <div className="py-6 text-center text-sm text-danger">
              Failed to load products.
            </div>
          )}
          {products && products.length === 0 && (
            <div className="py-6 text-center text-sm text-dim">
              No products found for this store.
            </div>
          )}
          {products && products.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-surface-2 uppercase tracking-wide text-muted">
                    <th className="px-2.5 py-2">SKU</th>
                    <th className="px-2.5 py-2">Name</th>
                    <th className="px-2.5 py-2">Price</th>
                    <th className="px-2.5 py-2">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2.5 py-2 font-mono">{p.sku || ""}</td>
                      <td className="px-2.5 py-2">{p.name || ""}</td>
                      <td className="px-2.5 py-2">
                        {p.price ? `Rs ${Number(p.price).toLocaleString()}` : ""}
                      </td>
                      <td className="px-2.5 py-2">{p.category || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
