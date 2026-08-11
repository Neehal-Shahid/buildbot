import { useEffect, useMemo, useState } from "react";
import { adminApi, type AdminStore } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/StatusBadge";
import { logActivity } from "../../../lib/activityLog";
import { ManageStoreModal } from "./ManageStoreModal";
import { ProductsModal } from "./ProductsModal";

export default function StoresTab() {
  const { token } = useAdminAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [stores, setStores] = useState<AdminStore[] | null>(null);
  const [search, setSearch] = useState("");
  const [manageStore, setManageStore] = useState<AdminStore | null>(null);
  const [productsStore, setProductsStore] = useState<{ storeId: string; name: string } | null>(null);

  function load() {
    if (!token) return;
    adminApi.stores(token).then((data) => setStores(data.stores));
  }

  useEffect(load, [token]);

  const filtered = useMemo(() => {
    if (!stores) return [];
    const q = search.toLowerCase();
    return stores.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [stores, search]);

  async function handleDisable(s: AdminStore) {
    const ok = await confirm({
      title: "Disable store?",
      desc: `${s.name} (${s.store_id}) — the widget will stop working for this store.`,
      okText: "Disable",
      variant: "danger",
    });
    if (!ok || !token) return;
    await adminApi.disableStore(token, s.store_id);
    logActivity("Store disabled", s.store_id);
    toast.success("Store disabled", "The store widget has been deactivated.");
    load();
  }

  async function handleActivate(s: AdminStore) {
    const ok = await confirm({
      title: "Activate store?",
      desc: `${s.name} (${s.store_id}) — the widget will be re-enabled for this store.`,
      okText: "Activate",
    });
    if (!ok || !token) return;
    await adminApi.activateStore(token, s.store_id);
    logActivity("Store activated", s.store_id);
    toast.success("Store activated", "The store widget has been re-enabled.");
    load();
  }

  async function handleDelete(s: AdminStore) {
    const ok = await confirm({
      title: "Permanently delete store?",
      desc: `${s.name} (${s.store_id}) — this removes all store data and cannot be undone.`,
      okText: "Delete permanently",
      variant: "danger",
    });
    if (!ok || !token) return;
    try {
      const data = await adminApi.deleteStore(token, s.store_id);
      if (data.success) {
        toast.success("Store deleted", "All store data has been permanently removed.");
        logActivity("Store deleted", s.store_id);
        load();
      }
    } catch {
      toast.error("Delete failed", "Something went wrong.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card
        title="All stores"
        subtitle={stores ? `${filtered.length} store${filtered.length !== 1 ? "s" : ""} registered` : undefined}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="mb-4 w-full max-w-xs rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted">
                <th className="pb-2">Name</th>
                <th className="pb-2">Email</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Products</th>
                <th className="pb-2">Recs</th>
                <th className="pb-2">Joined</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!stores && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-muted">
                    Loading stores…
                  </td>
                </tr>
              )}
              {stores && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-muted">
                    No stores registered yet.
                  </td>
                </tr>
              )}
              {filtered.map((s) => (
                <tr key={s.store_id} className="border-t border-border align-top">
                  <td className="py-2 font-semibold text-text">
                    {s.name}
                    {Number(s.connection_abuse_flag) ? (
                      <span
                        className="ml-1.5 rounded-full bg-danger-bg px-1.5 py-0.5 text-[10px] font-medium text-danger"
                        title={String(s.connection_abuse_note || "Credential abuse flagged")}
                      >
                        Abuse
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 text-text-2">{s.email}</td>
                  <td className="py-2">
                    <StatusBadge store={s} />
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => setProductsStore({ storeId: s.store_id, name: s.name })}
                      className="text-accent underline"
                    >
                      {s.product_count || 0}
                    </button>
                  </td>
                  <td className="py-2 text-text-2">{s.rec_count || 0}</td>
                  <td className="py-2 text-text-2">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                  </td>
                  <td className="whitespace-nowrap py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => handleActivate(s)}>
                        Activate
                      </Button>
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => handleDisable(s)}>
                        Disable
                      </Button>
                      <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => handleDelete(s)}>
                        Delete
                      </Button>
                      <Button variant="secondary" className="!px-2 !py-1 text-xs" onClick={() => setManageStore(s)}>
                        Manage
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ManageStoreModal
        key={manageStore?.store_id}
        store={manageStore}
        onClose={() => setManageStore(null)}
        onSaved={load}
      />
      <ProductsModal store={productsStore} onClose={() => setProductsStore(null)} />
    </div>
  );
}
