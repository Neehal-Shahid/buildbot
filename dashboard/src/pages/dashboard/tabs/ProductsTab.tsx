import { useEffect, useMemo, useRef, useState } from "react";
import { dashboardApi, type Product } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { ApiError } from "../../../lib/api";

const CATEGORIES = ["CPU", "Motherboard", "RAM", "Storage", "GPU", "PSU", "Case", "CPU Cooler", "Case Fans"];

const filterInputStyle = {
  padding: "10px 14px",
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-2)",
  fontSize: 13,
  outline: "none",
} as const;

export default function ProductsTab() {
  const { token, store } = useStoreAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);

  function load() {
    if (!token || !store) return;
    dashboardApi.products.list(token, store.storeId).then((data) => setProducts(data.products));
  }

  useEffect(load, [token, store]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.description || "").toLowerCase().includes(q)) return false;
      if (category && p.category !== category) return false;
      if (stockFilter === "1" && !p.in_stock) return false;
      if (stockFilter === "0" && p.in_stock) return false;
      return true;
    });
  }, [products, search, category, stockFilter]);

  async function toggleStock(p: Product) {
    if (!token) return;
    await dashboardApi.products.setStock(token, p.id, !p.in_stock);
    load();
  }

  async function confirmDelete() {
    if (!deleting || !token) return;
    try {
      await dashboardApi.products.remove(token, deleting.id);
      toast.success("Product deleted", "");
      setDeleting(null);
      load();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not delete product.");
    }
  }

  async function handleUploadClick() {
    const file = fileRef.current?.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    try {
      const data = await dashboardApi.products.upload(token, file);
      if (data.success) {
        toast.success("Upload complete", data.message);
        load();
      } else {
        toast.error("Upload failed", data.error || "");
      }
    } catch (err) {
      toast.error("Upload failed", err instanceof ApiError ? err.message : "Connection error.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="section-title">Product Catalog</div>
      <div className="section-sub">
        Edit SKUs, stock, and pricing here when your catalog source is <strong style={{ color: "var(--text)" }}>Manual / CSV</strong>.
        WooCommerce stores manage inventory in WordPress.
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Bulk upload</h2>
        <p style={{ marginBottom: 12 }}>CSV, Excel (.xlsx), Word (.docx), or PDF.</p>
        <div className="upload-area" onClick={() => fileRef.current?.click()}>
          <div className="ui">📄</div>
          <p>{fileRef.current?.files?.[0]?.name || "Click to choose a file"}</p>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.docx,.pdf" style={{ display: "none" }} onChange={handleUploadClick} />
        {uploading && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>Uploading…</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1 }}>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" style={{ ...filterInputStyle, maxWidth: 260 }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={filterInputStyle}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} style={filterInputStyle}>
            <option value="">All Status</option>
            <option value="1">In Stock</option>
            <option value="0">Out of Stock</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
            + Add Product
          </button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!products && (
              <tr>
                <td colSpan={5}>Loading…</td>
              </tr>
            )}
            {products && filtered.length === 0 && (
              <tr>
                <td colSpan={5}>No products found.</td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{Number(p.price).toLocaleString()}</td>
                <td>
                  <span className={`badge ${p.in_stock ? "badge-success" : "badge-danger"}`} style={{ cursor: "pointer" }} onClick={() => toggleStock(p)}>
                    {p.in_stock ? "In stock" : "Out of stock"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-sm" onClick={() => setEditing(p)}>
                      Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => setDeleting(p)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductModal product={editing} onClose={() => setEditing(null)} onSaved={load} />

      <div className={`modal-bg${deleting ? " open" : ""}`}>
        <div className="modal">
          <h3>Delete product?</h3>
          <p>"{deleting?.name}" will be permanently removed from your catalog.</p>
          <div className="modal-btns">
            <button className="btn btn-danger" onClick={confirmDelete}>
              Delete
            </button>
            <button className="btn" onClick={() => setDeleting(null)}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductModal({
  product,
  onClose,
  onSaved,
}: {
  product: Product | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { token } = useStoreAuth();
  const toast = useToast();
  const isNew = product === "new";
  const editingProduct = isNew ? null : product;

  const [name, setName] = useState(editingProduct?.name || "");
  const [cat, setCat] = useState(editingProduct?.category || CATEGORIES[0]);
  const [price, setPrice] = useState(editingProduct ? String(editingProduct.price) : "");
  const [description, setDescription] = useState(editingProduct?.description || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!token || !name || !cat || !price) {
      toast.error("Missing fields", "Name, category and price are required.");
      return;
    }
    setSaving(true);
    try {
      const body = { name, category: cat, price: parseFloat(price), description };
      const data =
        isNew || !editingProduct
          ? await dashboardApi.products.create(token, body)
          : await dashboardApi.products.update(token, editingProduct.id, body);
      if (data.success) {
        toast.success(isNew ? "Product added" : "Product updated", "");
        onSaved();
        onClose();
      } else {
        toast.error("Error", data.error || "Something went wrong.");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`modal-bg${product ? " open" : ""}`}>
      <div className="modal">
        {product && (
          <>
            <h3>{isNew ? "Add product" : "Edit product"}</h3>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Price</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <div className="modal-btns">
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                Save
              </button>
              <button className="btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
