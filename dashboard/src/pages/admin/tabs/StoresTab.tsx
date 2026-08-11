import { useEffect, useMemo, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { StatusBadge } from "../../../components/StatusBadge";
import { logActivity } from "../../../lib/activityLog";
import { ManageStoreModal } from "./ManageStoreModal";
import { ProductsModal } from "./ProductsModal";
import { ConfirmActionModal } from "./ConfirmActionModal";

export default function StoresTab() {
  const { token } = useAdminAuth();
  const toast = useToast();

  const [stores, setStores] = useState<AdminStore[] | null>(null);
  const [search, setSearch] = useState("");
  const [manageStore, setManageStore] = useState<AdminStore | null>(null);
  const [productsStore, setProductsStore] = useState<{ storeId: string; name: string } | null>(null);
  const [disableStore, setDisableStore] = useState<AdminStore | null>(null);
  const [activateStore, setActivateStore] = useState<AdminStore | null>(null);
  const [deleteStore, setDeleteStore] = useState<AdminStore | null>(null);

  function load() {
    if (!token) return;
    adminApi.stores(token).then((data) => setStores(data.stores));
  }

  useEffect(load, [token]);

  const filtered = useMemo(() => {
    if (!stores) return [];
    const q = search.toLowerCase();
    return stores.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
  }, [stores, search]);

  async function confirmDisable() {
    if (!disableStore || !token) return;
    await adminApi.disableStore(token, disableStore.store_id);
    logActivity("Store disabled", disableStore.store_id);
    toast.success("Store disabled", "The store widget has been deactivated.", );
    setDisableStore(null);
    load();
  }

  async function confirmActivate() {
    if (!activateStore || !token) return;
    await adminApi.activateStore(token, activateStore.store_id);
    logActivity("Store activated", activateStore.store_id);
    toast.success("Store activated", "The store widget has been re-enabled.");
    setActivateStore(null);
    load();
  }

  async function confirmDelete() {
    if (!deleteStore || !token) return;
    try {
      const data = await adminApi.deleteStore(token, deleteStore.store_id);
      if (data.success) {
        toast.success("Store deleted", "All store data has been permanently removed.");
        logActivity("Store deleted", deleteStore.store_id);
        setDeleteStore(null);
        load();
      }
    } catch {
      toast.error("Delete failed", "Something went wrong.");
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
              {stores ? `${filtered.length} store${filtered.length !== 1 ? "s" : ""} registered` : "Loading…"}
            </div>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ width: 220 }}
          />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Store</th>
                <th>Email</th>
                <th>Status</th>
                <th>Products</th>
                <th>Recs</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {!stores && (
                <tr>
                  <td colSpan={7}>Loading stores…</td>
                </tr>
              )}
              {stores && filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>No stores registered yet.</td>
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
                    <a
                      href="javascript:void(0)"
                      style={{ color: "var(--accent)", textDecoration: "underline" }}
                      onClick={() => setProductsStore({ storeId: s.store_id, name: s.name })}
                    >
                      {s.product_count || 0}
                    </a>
                  </td>
                  <td>{s.rec_count || 0}</td>
                  <td>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}</td>
                  <td style={{ minWidth: 160, whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "nowrap" }}>
                      <button className="action-btn act-activate" style={{ height: 28 }} onClick={() => setActivateStore(s)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
                        </svg>
                        <span className="ab-text">Activate</span>
                      </button>
                      <button className="action-btn act-disable" style={{ height: 28 }} onClick={() => setDisableStore(s)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                        </svg>
                        <span className="ab-text">Disable</span>
                      </button>
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
        confirmClass="btn btn-danger"
      />

      <ManageStoreModal key={manageStore?.store_id} store={manageStore} onClose={() => setManageStore(null)} onSaved={load} />
      <ProductsModal store={productsStore} onClose={() => setProductsStore(null)} />
    </div>
  );
}
