import { useEffect, useState } from "react";
import { dashboardApi } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { API_ORIGIN } from "../../../lib/config";
import { ApiError } from "../../../lib/api";

type Mode = "custom" | "woo";

function getStoredMode(): Mode {
  return (localStorage.getItem("bb_store_mode") as Mode) || "custom";
}

interface PluginStatus {
  hasKey: boolean;
  secret: string | null;
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
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not generate key.");
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
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  const btnBase = { display: "flex", alignItems: "center", gap: 6 } as const;

  return (
    <div>
      <div className="section-title">Store &amp; sync</div>
      <div className="section-sub">Manage your store's identity and choose your catalog source.</div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Store Profile</h2>
        <p style={{ marginBottom: 12 }}>Your store's identity on BuildVolt.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-2)" }}>Store Name</label>
            <input type="text" readOnly value={store?.name || ""} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "var(--surface-2)", color: "var(--text)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-2)" }}>Store ID</label>
            <input type="text" readOnly value={store?.storeId || ""} style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--r-md)", background: "var(--surface-2)", color: "var(--text)" }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Catalog source</h2>
        <p style={{ marginBottom: 12 }}>Pick where BuildVolt reads inventory from. You can switch anytime.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-sm"
            onClick={() => switchMode("custom")}
            style={{ ...btnBase, background: mode === "custom" ? "var(--accent-bg)" : undefined, border: mode === "custom" ? "1px solid var(--border-2)" : undefined }}
          >
            My Products (Manual / CSV)
          </button>
          <button
            className="btn btn-sm"
            onClick={() => switchMode("woo")}
            style={{ ...btnBase, background: mode === "woo" ? "var(--accent-bg)" : undefined, border: mode === "woo" ? "1px solid var(--border-2)" : undefined }}
          >
            WooCommerce
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, lineHeight: 1.55 }}>
          <strong style={{ color: "var(--text)" }}>Manual / CSV</strong> — catalog lives in BuildVolt (Products tab).{" "}
          <strong style={{ color: "var(--text)" }}>WooCommerce</strong> — sync from WordPress using the plugin below.
        </p>
      </div>

      {mode === "custom" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>Manual catalog</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginBottom: 12 }}>
            Add products or upload a CSV from the <strong style={{ color: "var(--text)" }}>Products</strong> tab.
          </p>
        </div>
      )}

      {mode === "woo" && (
        <div className="card" id="woo-section">
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div>
              <h2 style={{ margin: 0 }}>WooCommerce Auto-Sync</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                Connect your WooCommerce store — products sync automatically. No CSV needed.
              </p>
            </div>
            <div
              style={{
                marginLeft: "auto",
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: status?.wooConnected ? "rgba(5,150,105,0.12)" : "rgba(231,76,60,0.12)",
                color: status?.wooConnected ? "var(--success)" : "var(--danger)",
                border: `1px solid ${status?.wooConnected ? "rgba(5,150,105,0.3)" : "rgba(231,76,60,0.3)"}`,
              }}
            >
              {status?.wooConnected ? "● Connected" : "● Not Connected"}
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          {status?.wooConnected ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Store URL</div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500, wordBreak: "break-all" }}>{status.wooUrl || "—"}</div>
                </div>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Products Synced</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--success)" }}>{status.productCount}</div>
                </div>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Last Synced</div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>{status.lastSync ? new Date(status.lastSync).toLocaleString() : "Never"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <p style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0" }}>
                  To run a manual sync, go to your WordPress Admin panel &gt; WooCommerce &gt; BuildVolt and click Sync.
                </p>
                <button className="btn btn-sm" onClick={disconnect} disabled={disconnecting} style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)" }}>
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <StepCircle n={1} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Download the BuildVolt Plugin</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>Download and install this plugin on your WordPress website.</div>
                  <button className="btn btn-primary btn-sm" onClick={() => window.open(`${API_ORIGIN}/buildvolt-woocommerce.zip`, "_blank")}>
                    Download Plugin (.zip)
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <StepCircle n={2} muted />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Install &amp; Activate</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>WordPress Admin &gt; Plugins &gt; Add New &gt; Upload Plugin.</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <StepCircle n={3} muted />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Generate a secret key</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    Paste your Store ID and this key into the plugin's settings page.
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={generateKey} disabled={generating}>
                    {status?.hasKey ? "Generate new key" : "Generate key"}
                  </button>
                  {status?.secret && (
                    <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "monospace", fontSize: 12 }}>
                      {status.secret}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepCircle({ n, muted }: { n: number; muted?: boolean }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        background: muted ? "var(--border)" : "var(--accent)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {n}
    </div>
  );
}
