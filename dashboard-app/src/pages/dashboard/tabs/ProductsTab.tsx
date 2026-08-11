import { useEffect, useMemo, useRef, useState } from "react";
import { dashboardApi, type Product } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { ApiError } from "../../../lib/api";

const CATEGORIES = [
  "CPU",
  "Motherboard",
  "RAM",
  "Storage",
  "GPU",
  "PSU",
  "Case",
  "CPU Cooler",
  "Case Fans",
];

export default function ProductsTab() {
  const { token, store } = useStoreAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);

  const [products, setProducts] = useState<Product[] | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
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
      if (stockFilter === "in" && !p.in_stock) return false;
      if (stockFilter === "out" && p.in_stock) return false;
      return true;
    });
  }, [products, search, category, stockFilter]);

  const inStockCount = products?.filter((p) => p.in_stock).length ?? 0;
  const outOfStockCount = (products?.length ?? 0) - inStockCount;

  async function toggleStock(p: Product) {
    if (!token) return;
    await dashboardApi.products.setStock(token, p.id, !p.in_stock);
    load();
  }

  async function remove(p: Product) {
    const ok = await confirm({
      title: "Delete product?",
      desc: `"${p.name}" will be permanently removed from your catalog.`,
      okText: "Delete",
      variant: "danger",
    });
    if (!ok || !token) return;
    try {
      await dashboardApi.products.remove(token, p.id);
      toast.success("Product deleted", "");
      load();
    } catch {
      toast.error("Error", "Could not delete product.");
    }
  }

  async function handleUploadClick() {
    const file = fileRef.current?.files?.[0];
    if (!file || !token) return;

    if (products && products.length > 0) {
      const ok = await confirm({
        title: "Replace existing catalog?",
        desc: `You already have ${products.length} product(s). Uploading will add to your catalog.`,
        okText: "Continue",
      });
      if (!ok) return;
    }

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
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Total products</div>
          <div className="mt-1 text-2xl font-bold text-text">{products ? products.length : "—"}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">In stock</div>
          <div className="mt-1 text-2xl font-bold text-text">{products ? inStockCount : "—"}</div>
        </Card>
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">Out of stock</div>
          <div className="mt-1 text-2xl font-bold text-text">{products ? outOfStockCount : "—"}</div>
        </Card>
      </div>

      <Card title="Bulk upload" subtitle="CSV, Excel (.xlsx), Word (.docx), or PDF.">
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.docx,.pdf" className="text-sm" />
          <Button onClick={handleUploadClick} loading={uploading}>
            Upload
          </Button>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
            className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
          >
            <option value="all">All stock</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
          <Button onClick={() => setEditing("new")} className="ml-auto">
            Add product
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted">
                <th className="pb-2">Name</th>
                <th className="pb-2">Category</th>
                <th className="pb-2">Price</th>
                <th className="pb-2">Stock</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!products && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted">Loading…</td>
                </tr>
              )}
              {products && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-muted">No products found.</td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2 font-semibold text-text">{p.name}</td>
                  <td className="py-2 text-text-2">{p.category}</td>
                  <td className="py-2 text-text-2">{Number(p.price).toLocaleString()}</td>
                  <td className="py-2">
                    <button
                      onClick={() => toggleStock(p)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.in_stock ? "bg-success-bg text-success" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {p.in_stock ? "In stock" : "Out of stock"}
                    </button>
                  </td>
                  <td className="py-2">
                    <div className="flex gap-2">
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => setEditing(p)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => remove(p)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ProductModal
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
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
    } catch {
      toast.error("Error", "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={!!product} onClose={onClose}>
      {product && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-semibold text-text">
            {isNew ? "Add product" : "Edit product"}
          </h3>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">Category</label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              Save
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
