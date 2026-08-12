import { useEffect, useMemo, useRef, useState } from "react";
import { dashboardApi, type Product } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { ApiError } from "../../../lib/api";

// Must stay identical to CANONICAL_CATEGORIES in server/lib/categories.js —
// anything else is rejected by POST/PUT /product.
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [stockBusyId, setStockBusyId] = useState<number | null>(null);

  const [osposOpen, setOsposOpen] = useState(false);
  const [osposUseUrl, setOsposUseUrl] = useState(true);
  const [osposConnUrl, setOsposConnUrl] = useState("");
  // "Host" doubles as "host:port" so Port never needs its own box — 3306
  // is assumed unless a :port suffix is given.
  const [osposHost, setOsposHost] = useState("");
  const [osposDatabase, setOsposDatabase] = useState("");
  const [osposUsername, setOsposUsername] = useState("");
  const [osposPassword, setOsposPassword] = useState("");
  const [osposImporting, setOsposImporting] = useState(false);
  const [osposAutoSync, setOsposAutoSync] = useState<{ enabled: boolean; lastSync: string | null; productCount: number; host: string } | null>(null);
  const [osposDisabling, setOsposDisabling] = useState(false);

  // Asked whenever a second catalog method is used after the first
  // already put products in the list — never silently guessed. `run` is
  // whichever of runUpload/runOsposImport was waiting on the answer.
  const [confirmMode, setConfirmMode] = useState<{ run: (mode: "replace" | "append") => void } | null>(null);

  function loadOsposStatus() {
    if (!token) return;
    dashboardApi.products.osposAutoSyncStatus(token).then(setOsposAutoSync).catch(() => {});
  }

  useEffect(loadOsposStatus, [token]);

  async function stopOsposAutoSync() {
    if (!token) return;
    setOsposDisabling(true);
    try {
      await dashboardApi.products.disableOsposAutoSync(token);
      toast.success("Auto-sync stopped", "BuildVolt will no longer pull from OSPOS automatically.");
      loadOsposStatus();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not stop auto-sync.");
    } finally {
      setOsposDisabling(false);
    }
  }

  function load() {
    if (!token || !store) return;
    setLoadError(null);
    dashboardApi.products
      .list(token, store.storeId)
      .then((data) => setProducts(data.products))
      .catch((err) => {
        // Without this the table sat on "Loading…" forever.
        setProducts([]);
        setLoadError(
          err instanceof ApiError ? err.message : "Could not load your product catalog.",
        );
      });
  }

  useEffect(load, [token, store]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !(p.description || "").toLowerCase().includes(q)) return false;
      if (category && p.category !== category) return false;
      if (stockFilter === "1" && !p.in_stock) return false;
      if (stockFilter === "0" && p.in_stock) return false;
      return true;
    });
  }, [products, search, category, stockFilter]);

  const hasFilters = !!(search.trim() || category || stockFilter);

  async function toggleStock(p: Product) {
    if (!token || stockBusyId !== null) return;
    setStockBusyId(p.id);
    try {
      await dashboardApi.products.setStock(token, p.id, !p.in_stock);
      load();
    } catch (err) {
      // Previously unhandled: the badge just silently refused to change.
      toast.error(
        "Error",
        err instanceof ApiError ? err.message : "Could not update the stock status.",
      );
    } finally {
      setStockBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleting || !token || deleteBusy) return;
    setDeleteBusy(true);
    try {
      await dashboardApi.products.remove(token, deleting.id);
      toast.success("Product deleted", `"${deleting.name}" was removed from your catalog.`);
      setDeleting(null);
      load();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not delete the product.");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function runUpload(mode: "replace" | "append") {
    const file = fileRef.current?.files?.[0];
    if (!file || !token) return;
    setFileName(file.name);
    setUploading(true);
    try {
      const data = await dashboardApi.products.upload(token, file, mode);
      if (data.success) {
        toast.success("Upload complete", data.message);
        load();
      } else {
        toast.error("Upload failed", data.error || "The file could not be imported.");
      }
    } catch (err) {
      toast.error(
        "Upload failed",
        err instanceof ApiError ? err.message : "Could not upload your catalog file.",
      );
    } finally {
      setUploading(false);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Runs on every file selection — decides whether to ask Add-vs-Replace
  // first, or just go straight to "replace" when there's nothing to lose.
  function handleFileChosen() {
    if (!fileRef.current?.files?.[0] || !token) return;
    if (products === null) {
      toast.error("Still loading", "Your current catalog is still loading — try again in a moment.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (products.length > 0) {
      setConfirmMode({ run: runUpload });
    } else {
      runUpload("replace");
    }
  }

  // Accepts "host" or "host:port" in the single Host box, so Port never
  // needs a field of its own — 3306 is assumed when no port is given.
  function splitHostPort(input: string): { host: string; port: string } {
    const trimmed = input.trim();
    const lastColon = trimmed.lastIndexOf(":");
    if (lastColon > 0 && /^\d+$/.test(trimmed.slice(lastColon + 1))) {
      return { host: trimmed.slice(0, lastColon), port: trimmed.slice(lastColon + 1) };
    }
    return { host: trimmed, port: "3306" };
  }

  // Many hosts (and OSPOS's own .env-style config) already hand out a
  // single mysql://user:pass@host:port/database string — parsing that
  // turns a 4-field form into a 1-field paste for anyone who has one.
  function parseConnectionUrl(raw: string) {
    const withScheme = raw.trim().replace(/^mysql:\/\//, "");
    const url = new URL(`mysql://${withScheme}`);
    const database = url.pathname.replace(/^\//, "");
    if (!url.hostname || !url.username || !database) {
      throw new Error("That doesn't look like a complete connection URL (need user:pass@host/database).");
    }
    return {
      host: url.hostname,
      port: url.port || "3306",
      database,
      username: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  }

  async function runOsposImport(mode: "replace" | "append") {
    if (!token) return;

    let creds: { host: string; port: string; database: string; username: string; password: string };
    if (osposUseUrl) {
      if (!osposConnUrl.trim()) {
        toast.error("Missing URL", "Paste your connection URL, or switch to entering details separately.");
        return;
      }
      try {
        creds = parseConnectionUrl(osposConnUrl);
      } catch (err) {
        toast.error("Invalid URL", err instanceof Error ? err.message : "Could not read that connection URL.");
        return;
      }
    } else {
      if (!osposHost.trim() || !osposDatabase.trim() || !osposUsername.trim()) {
        toast.error("Missing fields", "Host, database name, and username are required.");
        return;
      }
      const { host, port } = splitHostPort(osposHost);
      creds = { host, port, database: osposDatabase.trim(), username: osposUsername.trim(), password: osposPassword };
    }

    setOsposImporting(true);
    try {
      const data = await dashboardApi.products.importFromOspos(token, creds, mode);
      if (data.success) {
        toast.success("Import complete", data.message || `${data.synced ?? 0} products imported.`);
        setOsposOpen(false);
        setOsposPassword("");
        setOsposConnUrl("");
        load();
        loadOsposStatus();
      } else {
        toast.error("Import failed", data.error || "Could not import from OSPOS.");
      }
    } catch (err) {
      toast.error("Import failed", err instanceof ApiError ? err.message : "Could not connect to OSPOS.");
    } finally {
      setOsposImporting(false);
    }
  }

  // Runs when "Import now" is clicked — asks Add-vs-Replace first only if
  // there's actually something that could be lost.
  function handleOsposImportClick() {
    if (!token) return;
    if (products === null) {
      toast.error("Still loading", "Your current catalog is still loading — try again in a moment.");
      return;
    }
    if (products.length > 0) {
      setConfirmMode({ run: runOsposImport });
    } else {
      runOsposImport("replace");
    }
  }

  return (
    <div>
      <div className="section-title">Product Catalog</div>
      <div className="section-sub">
        Build your catalog with any combination of the three methods below — add products one at a time, upload a
        file, or import from OSPOS. If you're on WordPress with the BuildVolt plugin connected, that catalog syncs
        automatically and shows up here too, but is still managed from WooCommerce itself.
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Bulk upload</h2>
        <p style={{ marginBottom: 12 }}>
          CSV, Excel (.xlsx), Word (.docx), or PDF — with a Name, Category, Price and optional Description per row.
          Max 5MB. Supported categories: {CATEGORIES.join(", ")}.
        </p>
        <div
          className="upload-area"
          role="button"
          tabIndex={0}
          aria-label="Choose a catalog file to upload"
          onClick={() => !uploading && fileRef.current?.click()}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === " ") && !uploading) {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
        >
          <div className="ui">📄</div>
          {/* Held in state — reading fileRef during render never re-rendered,
              so the chosen filename was effectively never shown. */}
          <p>{uploading ? `Uploading ${fileName}…` : "Click to choose a file"}</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.docx,.pdf"
          style={{ display: "none" }}
          onChange={handleFileChosen}
        />
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Import from OSPOS</h2>
            <p style={{ margin: "4px 0 0" }}>
              {osposAutoSync?.enabled
                ? "Connected — BuildVolt keeps this catalog in sync with OSPOS automatically."
                : "Pull your catalog directly from Open Source Point of Sale — one click, nothing to install."}
            </p>
          </div>
          {!osposAutoSync?.enabled && (
            <button type="button" className="btn btn-sm" onClick={() => setOsposOpen((v) => !v)}>
              {osposOpen ? "Cancel" : "Import from OSPOS"}
            </button>
          )}
        </div>

        {osposAutoSync?.enabled ? (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                marginBottom: 14,
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                display: "inline-block",
                background: "rgba(5,150,105,0.12)",
                color: "var(--success)",
                border: "1px solid rgba(5,150,105,0.3)",
              }}
            >
              ● Auto-sync ON
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(150px, 100%), 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Database Host</div>
                <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500, wordBreak: "break-all" }}>{osposAutoSync.host || "—"}</div>
              </div>
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Products Synced</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--success)" }}>{osposAutoSync.productCount}</div>
              </div>
              <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Last Synced</div>
                <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>
                  {osposAutoSync.lastSync ? new Date(osposAutoSync.lastSync).toLocaleString() : "Never"}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
              Runs automatically every few hours — no need to re-import when your OSPOS listing changes. This always
              merges (updates existing items, adds new ones) and never deletes anything from your catalog, even
              products added through a different method — only a manual "Replace entire list" choice above does that.
            </p>
            <button
              type="button"
              className={`btn btn-sm${osposDisabling ? " is-loading" : ""}`}
              onClick={stopOsposAutoSync}
              disabled={osposDisabling}
              style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)" }}
            >
              {osposDisabling ? "Stopping…" : "Stop auto-sync"}
            </button>
          </div>
        ) : (
          osposOpen && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginBottom: 14 }}>
                Connect your OSPOS database below — your host or whoever set up OSPOS can give you these details;
                on shared hosting (cPanel), check for a <strong style={{ color: "var(--text)" }}>Remote MySQL</strong>{" "}
                setting to allow the connection.{" "}
                <strong style={{ color: "var(--text)" }}>
                  After this first import, BuildVolt securely stores these details (encrypted) and keeps your
                  catalog in sync with OSPOS automatically
                </strong>{" "}
                — you can turn that off any time below.
              </p>

              <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="radio" checked={osposUseUrl} onChange={() => setOsposUseUrl(true)} />
                  Paste a connection URL
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input type="radio" checked={!osposUseUrl} onChange={() => setOsposUseUrl(false)} />
                  Enter details separately
                </label>
              </div>

              {osposUseUrl ? (
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" htmlFor="ospos-url">Connection URL</label>
                  <input
                    id="ospos-url"
                    type="text"
                    placeholder="mysql://username:password@host:3306/database_name"
                    value={osposConnUrl}
                    onChange={(e) => setOsposConnUrl(e.target.value)}
                  />
                  <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                    One line, in the form <code>username:password@host/database</code> — many hosting panels show
                    this exact string already. Don't have one? Switch to "Enter details separately" above.
                  </p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label className="form-label" htmlFor="ospos-host">Database Host</label>
                    <input
                      id="ospos-host"
                      type="text"
                      placeholder="e.g. localhost or db.hostingsite.com"
                      value={osposHost}
                      onChange={(e) => setOsposHost(e.target.value)}
                    />
                    <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                      Not on port 3306? Add it here too, e.g. <code>db.host.com:3307</code>.
                    </p>
                  </div>
                  <div>
                    <label className="form-label" htmlFor="ospos-db">Database Name</label>
                    <input id="ospos-db" type="text" value={osposDatabase} onChange={(e) => setOsposDatabase(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="ospos-user">Username</label>
                    <input id="ospos-user" type="text" value={osposUsername} onChange={(e) => setOsposUsername(e.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="ospos-pass">Password</label>
                    <input id="ospos-pass" type="password" value={osposPassword} onChange={(e) => setOsposPassword(e.target.value)} />
                  </div>
                </div>
              )}

              <button
                type="button"
                className={`btn btn-primary btn-sm${osposImporting ? " is-loading" : ""}`}
                onClick={handleOsposImportClick}
                disabled={osposImporting}
              >
                {osposImporting ? "Importing…" : "Import now"}
              </button>
            </div>
          )
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, flexWrap: "wrap" }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
            style={{ ...filterInputStyle, maxWidth: 260 }}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" style={filterInputStyle}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} aria-label="Filter by stock status" style={filterInputStyle}>
            <option value="">All Status</option>
            <option value="1">In Stock</option>
            <option value="0">Out of Stock</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing("new")}>
            + Add Product
          </button>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-error show" style={{ marginBottom: 16 }}>
          {loadError}
        </div>
      )}

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
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  {/* "No products found" read as an error when the catalog was
                      simply still empty. */}
                  {loadError
                    ? "Your catalog could not be loaded."
                    : products.length === 0
                      ? "No products yet — add one manually or upload a catalog file above."
                      : hasFilters
                        ? "No products match these filters."
                        : "No products found."}
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>{Number(p.price).toLocaleString()}</td>
                <td>
                  <span
                    className={`badge ${p.in_stock ? "badge-success" : "badge-danger"}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Mark "${p.name}" as ${p.in_stock ? "out of stock" : "in stock"}`}
                    style={{ cursor: stockBusyId === p.id ? "wait" : "pointer", opacity: stockBusyId === p.id ? 0.5 : 1 }}
                    onClick={() => toggleStock(p)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleStock(p);
                      }
                    }}
                  >
                    {p.in_stock ? "In stock" : "Out of stock"}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="btn btn-sm" onClick={() => setEditing(p)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => setDeleting(p)}>
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

      <div className={`modal-bg${confirmMode ? " open" : ""}`}>
        <div className="modal">
          <h2>Add or replace?</h2>
          <p>
            You already have {products?.length ?? 0} product{products?.length === 1 ? "" : "s"} in your catalog.
            Add these on top of them, or replace the entire list with just this new source?
          </p>
          <div className="modal-btns" style={{ flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                confirmMode?.run("append");
                setConfirmMode(null);
              }}
            >
              Add to existing list
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                confirmMode?.run("replace");
                setConfirmMode(null);
              }}
            >
              Replace entire list
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setConfirmMode(null);
                // A cancelled file pick must be cleared, or re-choosing the
                // exact same file wouldn't fire onChange a second time.
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className={`modal-bg${deleting ? " open" : ""}`}>
        <div className="modal">
          <h2>Delete product?</h2>
          <p>"{deleting?.name}" will be permanently removed from your catalog.</p>
          <div className="modal-btns">
            <button
              type="button"
              className={`btn btn-danger${deleteBusy ? " is-loading" : ""}`}
              onClick={confirmDelete}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting…" : "Delete"}
            </button>
            <button type="button" className="btn" onClick={() => setDeleting(null)} disabled={deleteBusy}>
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

  const [name, setName] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // This modal is always mounted (only its `open` class toggles), so the
  // useState initialisers ran exactly once — while `product` was still
  // null. Every "Edit" therefore opened with completely blank fields and
  // saving hit the "Name, category and price are required" guard. Sync the
  // form to whichever product is being opened instead.
  useEffect(() => {
    if (!product) return;
    if (product === "new") {
      setName("");
      setCat(CATEGORIES[0]);
      setPrice("");
      setDescription("");
    } else {
      setName(product.name || "");
      setCat(product.category || CATEGORIES[0]);
      setPrice(product.price === undefined || product.price === null ? "" : String(product.price));
      setDescription(product.description || "");
    }
  }, [product]);

  async function save() {
    const cleanName = name.trim();
    const parsedPrice = parseFloat(price);
    if (!token || !cleanName || !cat || !Number.isFinite(parsedPrice)) {
      toast.error("Missing fields", "Name, category and a numeric price are required.");
      return;
    }
    if (parsedPrice <= 0) {
      // The server treats a 0 price as missing (`!price`), so catch it here
      // with a message that actually explains the problem.
      toast.error("Invalid price", "Price must be greater than zero.");
      return;
    }
    setSaving(true);
    try {
      const body = { name: cleanName, category: cat, price: parsedPrice, description: description.trim() };
      const data =
        isNew || !editingProduct
          ? await dashboardApi.products.create(token, body)
          : await dashboardApi.products.update(token, editingProduct.id, body);
      if (data.success) {
        toast.success(isNew ? "Product added" : "Product updated", cleanName);
        onSaved();
        onClose();
      } else {
        toast.error("Error", data.error || "Could not save the product.");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not save the product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`modal-bg${product ? " open" : ""}`}>
      <div className="modal">
        {product && (
          <>
            <h2>{isNew ? "Add product" : "Edit product"}</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="product-name">
                Name
              </label>
              <input id="product-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="product-category">
                Category
              </label>
              <select id="product-category" value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="product-price">
                Price
              </label>
              <input
                id="product-price"
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="product-description">
                Description (optional)
              </label>
              <textarea
                id="product-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="modal-btns">
              <button
                type="button"
                className={`btn btn-primary${saving ? " is-loading" : ""}`}
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" className="btn" onClick={onClose} disabled={saving}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
