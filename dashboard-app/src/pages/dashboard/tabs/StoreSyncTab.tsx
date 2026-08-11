import { useEffect, useState } from "react";
import { dashboardApi } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { API_ORIGIN } from "../../../lib/config";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

type Mode = "custom" | "woo";

function getStoredMode(): Mode {
  return (localStorage.getItem("bb_store_mode") as Mode) || "custom";
}

interface PluginStatus {
  hasKey: boolean;
  secret: string | null;
  maskedSecret: string | null;
  wooConnected: boolean;
  wooUrl: string;
  lastSync: string | null;
  productCount: number;
}

export default function StoreSyncTab() {
  const { token, store } = useStoreAuth();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(getStoredMode());
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [generating, setGenerating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  function load() {
    if (!token) return;
    dashboardApi.plugin.status(token).then((data) => {
      setStatus(data);
      if (data.wooConnected) setMode("woo");
    });
  }

  useEffect(load, [token]);

  function switchMode(next: Mode) {
    setMode(next);
    localStorage.setItem("bb_store_mode", next);
  }

  async function generateKey() {
    if (!token) return;
    setGenerating(true);
    try {
      const data = await dashboardApi.plugin.generateKey(token);
      if (data.success) {
        toast.success("Key generated", "Copy it into your WordPress plugin settings.");
        load();
      } else {
        toast.error("Could not generate key", data.error || "");
      }
    } catch {
      toast.error("Error", "Could not generate key.");
    } finally {
      setGenerating(false);
    }
  }

  async function disconnect() {
    if (!token) return;
    setDisconnecting(true);
    try {
      await dashboardApi.plugin.disconnect(token);
      toast.success("Disconnected", "WooCommerce has been disconnected.");
      load();
    } catch {
      toast.error("Error", "Could not disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Store">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Name</div>
            <div className="font-semibold text-text">{store?.name}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Store ID</div>
            <div className="font-mono text-text">{store?.storeId}</div>
          </div>
        </div>
      </Card>

      <Card title="Catalog source" subtitle="Choose how your product catalog is managed.">
        <div className="flex gap-2">
          <Button variant={mode === "custom" ? "primary" : "secondary"} onClick={() => switchMode("custom")}>
            Manual / CSV
          </Button>
          <Button variant={mode === "woo" ? "primary" : "secondary"} onClick={() => switchMode("woo")}>
            WooCommerce
          </Button>
        </div>
      </Card>

      {mode === "custom" && (
        <Card>
          <p className="text-sm text-muted">
            Manage products directly from the Products tab, or bulk-upload a CSV/Excel/Word/PDF file.
          </p>
        </Card>
      )}

      {mode === "woo" && (
        <Card title="WooCommerce connection">
          {status?.wooConnected ? (
            <div className="flex flex-col gap-3 text-sm">
              <div>
                Connected to <strong className="text-text">{status.wooUrl}</strong>
              </div>
              <div className="text-text-2">
                {status.productCount} products synced
                {status.lastSync ? ` · last synced ${new Date(status.lastSync).toLocaleString()}` : ""}
              </div>
              <Button variant="danger" onClick={disconnect} loading={disconnecting} className="w-fit">
                Disconnect WooCommerce
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-muted">
                Install the BuildVolt WooCommerce plugin, then generate a secret key here and paste
                it into the plugin settings along with your Store ID.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => window.open(`${API_ORIGIN}/buildvolt-woocommerce.zip`, "_blank")}
                >
                  Download plugin
                </Button>
                <Button onClick={generateKey} loading={generating}>
                  {status?.hasKey ? "Generate new key" : "Generate key"}
                </Button>
              </div>
              {status?.secret && (
                <div className="rounded-md border border-border bg-bg p-3 font-mono text-xs">
                  {status.secret}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
