import { useEffect, useMemo, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { StatusBadge } from "../../../components/StatusBadge";
import { ManageStoreModal } from "./ManageStoreModal";
import { ProductsModal } from "./ProductsModal";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { ApiError } from "../../../lib/api";

export default function StoresTab() {
  const { token } = useAdminAuth();
  const toast = useToast();

  const [stores, setStores] = useState<AdminStore[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"joined" | "products" | "recs" | "name">("joined");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [manageStore, setManageStore] = useState<AdminStore | null>(null);
  const [productsStore, setProductsStore] = useState<{ storeId: string; name: string } | null>(null);
  const [disableStore, setDisableStore] = useState<AdminStore | null>(null);
  const [activateStore, setActivateStore] = useState<AdminStore | null>(null);
  const [deleteStore, setDeleteStore] = useState<AdminStore | null>(null);

  function load() {
    if (!token) return;
    setLoadError(null);
    adminApi
      .stores(token)
      .then((data) => setStores(data.stores))
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : "Could not load stores."),
      );
  }

  useEffect(load, [token]);

  const filtered = useMemo(() => {
    if (!stores) return [];
    const q = search.toLowerCase();
    const matched = stores.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    const dir = sortDir === "asc" ? 1 : -1;
    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case "products":
          return dir * ((a.product_count || 0) - (b.product_count || 0));
        case "recs":
          return dir * ((a.rec_count || 0) - (b.rec_count || 0));
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "joined":
        default:
          return dir * (a.created_at || "").localeCompare(b.created_at || "");
      }
    });
  }, [stores, search, sortBy, sortDir]);

  function toggleSort(col: "joined" | "products" | "recs" | "name") {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      // Joining/counts read most usefully high-to-low by default; name
      // reads most usefully A-to-Z.
      setSortDir(col === "name" ? "asc" : "desc");
    }
  }

  function sortIndicator(col: "joined" | "products" | "recs" | "name") {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  async function confirmDisable() {
    if (!disableStore || !token) return;
    try {
      // Server-side now logs this to the real audit log itself.
      await adminApi.disableStore(token, disableStore.store_id);
      toast.success("Store disabled", "The store widget has been deactivated.");
      setDisableStore(null);
      load();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not disable store.");
    }
  }

  async function confirmActivate() {
    if (!activateStore || !token) return;
    try {
      await adminApi.activateStore(token, activateStore.store_id);
      toast.success("Store activated", "The store widget has been re-enabled.");
      setActivateStore(null);
      load();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not activate store.");
    }
  }

  async function confirmDelete() {
    if (!deleteStore || !token) return;
    try {
      await adminApi.deleteStore(token, deleteStore.store_id);
      toast.success("Store deleted", "All store data has been permanently removed.");
      setDeleteStore(null);
      load();
    } catch (err) {
      toast.error("Delete failed", err instanceof ApiError ? err.message : "Could not delete store.");
    }
  }

  return (
    <div>
      <div className="section-title">All Stores</div>
      <div className="section-sub">Every store registered on BuildVolt.</div>
      <div className="card">
        <div className="card-head">
          <div>
            <h2>Stores</h2>
            <div className="card-sub">
              {!stores
                ? loadError
                  ? "Could not load stores"
                  : "Loading…"
                : search
                  ? `${filtered.length} of ${stores.length} store${stores.length !== 1 ? "s" : ""} matching`
                  : `${stores.length} store${stores.length !== 1 ? "s" : ""} registered`}
            </div>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search stores by name or email"
            style={{ width: 220, maxWidth: "100%" }}
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("name")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleSort("name")}
                >
                  Store{sortIndicator("name")}
                </th>
                <th>Email</th>
                <th>Status</th>
                <th
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("products")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleSort("products")}
                >
                  Products{sortIndicator("products")}
                </th>
                <th
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("recs")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleSort("recs")}
                >
                  Recs{sortIndicator("recs")}
                </th>
                <th
                  role="button"
                  tabIndex={0}
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => toggleSort("joined")}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleSort("joined")}
                >
                  Joined{sortIndicator("joined")}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!stores && !loadError && (
                <tr>
                  <td colSpan={7}>Loading stores…</td>
                </tr>
              )}
              {!stores && loadError && (
                <tr>
                  <td colSpan={7} style={{ color: "var(--danger)" }}>
                    {loadError}{" "}
                    <button
                      type="button"
                      onClick={load}
                      style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--accent)", textDecoration: "underline", cursor: "pointer" }}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              )}
              {stores && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>{search ? "No stores match your search." : "No stores registered yet."}</td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={s.store_id}>
                  <td>
                    <strong>{s.name}</strong>
                    {Number(s.connection_abuse_flag) ? (
                      <span className="badge badge-danger" title={String(s.connection_abuse_note || "Credential abuse flagged")}>
                        {" "}
                        Abuse
                      </span>
                    ) : null}
                  </td>
                  <td>{s.email}</td>
                  <td>
                    <StatusBadge store={s} />
                  </td>
                  <td>
                    <button
                      type="button"
                      title={`View ${s.name}'s product catalog`}
                      style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--accent)", textDecoration: "underline", cursor: "pointer" }}
                      onClick={() => setProductsStore({ storeId: s.store_id, name: s.name })}
                    >
                      {s.product_count || 0}
                    </button>
                  </td>
                  <td>{s.rec_count || 0}</td>
                  <td>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</td>
                  <td style={{ minWidth: 160, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap" }}>
                      {/* Only the applicable transition is offered: re-running
                          /admin/disable-store on an already-disabled store
                          re-sends the "store disabled" email to its owner. */}
                      {s.effectiveStatus === "disabled" ? (
                        <button className="action-btn act-activate" style={{ height: 28 }} onClick={() => setActivateStore(s)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                          </svg>
                          <span className="ab-text">Activate</span>
                        </button>
                      ) : (
                        <button className="action-btn act-disable" style={{ height: 28 }} onClick={() => setDisableStore(s)}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                          <span className="ab-text">Disable</span>
                        </button>
                      )}
                      <button className="action-btn act-delete" style={{ height: 28 }} onClick={() => setDeleteStore(s)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                        <span className="ab-text">Delete</span>
                      </button>
                      <button className="action-btn act-manage" style={{ height: 28 }} onClick={() => setManageStore(s)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        <span className="ab-text">Manage</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmActionModal
        open={!!disableStore}
        onClose={() => setDisableStore(null)}
        onConfirm={confirmDisable}
        iconBg="var(--warning-bg)"
        iconColor="var(--warning)"
        icon={
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        }
        title="Disable Store"
        desc="This will deactivate the store's widget. Their customers will see an error. You can re-enable at any time."
        detail={disableStore && <><strong>Store:</strong> {disableStore.name}<br /><strong>Store ID:</strong> {disableStore.store_id}</>}
        confirmLabel="Disable Store"
        busyLabel="Disabling…"
        confirmClass="btn btn-warning"
      />

      <ConfirmActionModal
        open={!!activateStore}
        onClose={() => setActivateStore(null)}
        onConfirm={confirmActivate}
        iconBg="var(--accent-light)"
        iconColor="var(--accent)"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
          </svg>
        }
        title="Activate Store"
        desc="This will re-enable the store's widget. Their customers will be able to get recommendations again."
        detail={activateStore && <><strong>Store:</strong> {activateStore.name}<br /><strong>Store ID:</strong> {activateStore.store_id}</>}
        confirmLabel="Activate Store"
        busyLabel="Activating…"
        confirmClass="btn btn-primary"
      />

      <ConfirmActionModal
        open={!!deleteStore}
        onClose={() => setDeleteStore(null)}
        onConfirm={confirmDelete}
        iconBg="var(--danger-bg)"
        iconColor="var(--danger)"
        icon={
          <svg viewBox="0 0 24 24">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4" />
          </svg>
        }
        title="Delete Store Permanently"
        desc="This will permanently delete the store and ALL their products, recommendations and data. This cannot be undone."
        detail={deleteStore && <><strong>Store:</strong> {deleteStore.name}<br /><strong>Store ID:</strong> {deleteStore.store_id}</>}
        confirmLabel="Delete Permanently"
        busyLabel="Deleting…"
        confirmClass="btn btn-danger"
      />

      <ManageStoreModal key={manageStore?.store_id} store={manageStore} onClose={() => setManageStore(null)} onSaved={load} />
      <ProductsModal store={productsStore} onClose={() => setProductsStore(null)} />
    </div>
  );
}
