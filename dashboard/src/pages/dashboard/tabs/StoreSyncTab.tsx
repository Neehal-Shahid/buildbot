import { useEffect, useState } from "react";
import { dashboardApi } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { API_ORIGIN } from "../../../lib/config";
import { ApiError } from "../../../lib/api";

type Mode = "custom" | "woo" | "ospos";

function getStoredMode(): Mode {
  const saved = localStorage.getItem("bb_store_mode");
  return saved === "woo" || saved === "ospos" ? saved : "custom";
}

interface PluginStatus {
  hasKey: boolean;
  secret: string | null;
  wooConnected: boolean;
  wooUrl: string;
  lastSync: string | null;
  productCount: number;
}

interface OsposStatus {
  hasKey: boolean;
  osposConnected: boolean;
  exportUrl: string;
  lastSync: string | null;
  productCount: number;
}

// Two text fields side by side stayed side by side all the way down to
// 320px wide; below ~440px of available width they now stack.
const responsiveCols = (min: number) => ({
  display: "grid",
  gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
  gap: 16,
});

const readonlyInputStyle = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-md)",
  background: "var(--surface-2)",
  color: "var(--text)",
} as const;

export default function StoreSyncTab() {
  const { token, store } = useStoreAuth();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(getStoredMode());
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [osposStatus, setOsposStatus] = useState<OsposStatus | null>(null);
  const [osposError, setOsposError] = useState<string | null>(null);
  const [exportUrlInput, setExportUrlInput] = useState("");
  const [savingExportUrl, setSavingExportUrl] = useState(false);
  const [pullingNow, setPullingNow] = useState(false);
  const [osposDisconnecting, setOsposDisconnecting] = useState(false);
  const [confirmOsposDisconnect, setConfirmOsposDisconnect] = useState(false);

  function load() {
    if (!token) return;
    setError(null);
    dashboardApi.plugin
      .status(token)
      .then((data) => {
        setStatus(data);
        if (data.wooConnected) {
          setMode("woo");
          // Keep the remembered choice in step with reality, otherwise a
          // reload flips back to "custom" before the status call lands.
          localStorage.setItem("bb_store_mode", "woo");
        }
      })
      .catch((err) => {
        // Previously unhandled — a failed status call left the panel
        // confidently reporting "Not Connected".
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load your WooCommerce connection status.",
        );
      });

    setOsposError(null);
    dashboardApi.ospos
      .status(token)
      .then((data) => {
        setOsposStatus(data);
        setExportUrlInput(data.exportUrl || "");
        if (data.osposConnected) {
          setMode("ospos");
          localStorage.setItem("bb_store_mode", "ospos");
        }
      })
      .catch((err) => {
        setOsposError(
          err instanceof ApiError ? err.message : "Could not load your OSPOS connection status.",
        );
      });
  }

  useEffect(load, [token]);

  function switchMode(next: Mode) {
    setMode(next);
    localStorage.setItem("bb_store_mode", next);
  }

  async function copy(value: string, label: string) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      toast.success("Copied", `${label} copied to clipboard.`);
    } catch {
      toast.error("Couldn't copy automatically", `Select your ${label.toLowerCase()} and copy it manually.`);
    }
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
        toast.error("Could not generate key", data.error || "Please try again.");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not generate a key.");
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
      setConfirmDisconnect(false);
      load();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not disconnect WooCommerce.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function saveExportUrl() {
    if (!token || !exportUrlInput.trim()) return;
    setSavingExportUrl(true);
    try {
      // One click, one request: this saves the URL AND pulls the catalog
      // immediately (server/routes/ospos.js), the same one-click,
      // see-the-result-instantly feel as the CSV upload button.
      const data = await dashboardApi.ospos.configure(token, exportUrlInput.trim());
      if (data.success) {
        toast.success("Connected", data.message || `${data.synced ?? 0} products pulled from OSPOS.`);
        load();
      } else if (data.urlSaved) {
        // URL is saved so it isn't lost, but the first pull itself failed
        // (wrong key, file not uploaded yet, etc.) — surface that clearly
        // rather than implying success.
        toast.error("Connection saved, but sync failed", data.error || "Check the file and try \"Sync now\".");
        load();
      } else {
        toast.error("Could not save", data.error || "Please check the URL and try again.");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not save the export URL.");
    } finally {
      setSavingExportUrl(false);
    }
  }

  async function pullNow() {
    if (!token) return;
    setPullingNow(true);
    try {
      const data = await dashboardApi.ospos.pullNow(token);
      if (data.success) {
        toast.success("Synced", `${data.synced ?? 0} products pulled from OSPOS.`);
        load();
      } else {
        toast.error("Sync failed", data.error || "Please try again.");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not pull from OSPOS.");
    } finally {
      setPullingNow(false);
    }
  }

  async function disconnectOspos() {
    if (!token) return;
    setOsposDisconnecting(true);
    try {
      await dashboardApi.ospos.disconnect(token);
      toast.success("Disconnected", "OSPOS has been disconnected.");
      setConfirmOsposDisconnect(false);
      setExportUrlInput("");
      load();
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not disconnect OSPOS.");
    } finally {
      setOsposDisconnecting(false);
    }
  }

  const btnBase = { display: "flex", alignItems: "center", gap: 6 } as const;

  return (
    <div>
      <div className="section-title">Store &amp; sync</div>
      <div className="section-sub">Manage your store's identity and choose your catalog source.</div>

      {error && (
        <div className="alert alert-error show" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Store Profile</h2>
        <p style={{ marginBottom: 12 }}>Your store's identity on BuildVolt.</p>
        <div style={responsiveCols(220)}>
          <div>
            <label htmlFor="store-name" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-2)" }}>
              Store Name
            </label>
            <input id="store-name" type="text" readOnly value={store?.name || ""} style={readonlyInputStyle} />
          </div>
          <div>
            <label htmlFor="store-id" style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-2)" }}>
              Store ID
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="store-id" type="text" readOnly value={store?.storeId || ""} style={readonlyInputStyle} />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => copy(store?.storeId || "", "Store ID")}
                style={{ whiteSpace: "nowrap" }}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Catalog source</h2>
        <p style={{ marginBottom: 12 }}>Pick where BuildVolt reads inventory from. You can switch anytime.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={mode === "custom"}
            onClick={() => switchMode("custom")}
            style={{ ...btnBase, background: mode === "custom" ? "var(--accent-bg)" : undefined, border: mode === "custom" ? "1px solid var(--border-2)" : undefined }}
          >
            My Products (Manual / CSV)
          </button>
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={mode === "woo"}
            onClick={() => switchMode("woo")}
            style={{ ...btnBase, background: mode === "woo" ? "var(--accent-bg)" : undefined, border: mode === "woo" ? "1px solid var(--border-2)" : undefined }}
          >
            WooCommerce
          </button>
          <button
            type="button"
            className="btn btn-sm"
            aria-pressed={mode === "ospos"}
            onClick={() => switchMode("ospos")}
            style={{ ...btnBase, background: mode === "ospos" ? "var(--accent-bg)" : undefined, border: mode === "ospos" ? "1px solid var(--border-2)" : undefined }}
          >
            OSPOS
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, lineHeight: 1.55 }}>
          <strong style={{ color: "var(--text)" }}>Manual / CSV</strong> — catalog lives in BuildVolt (Products tab).{" "}
          <strong style={{ color: "var(--text)" }}>WooCommerce</strong> — sync from WordPress using the plugin below.{" "}
          <strong style={{ color: "var(--text)" }}>OSPOS</strong> — sync from Open Source Point of Sale automatically.
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
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
              {!status && !error ? "● Checking…" : status?.wooConnected ? "● Connected" : "● Not Connected"}
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          {status?.wooConnected ? (
            <div>
              <div style={{ ...responsiveCols(150), marginBottom: 20, gap: 12 }}>
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
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <p style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0", flex: 1, minWidth: 220 }}>
                  To run a manual sync, go to your WordPress Admin panel &gt; WooCommerce &gt; BuildVolt and click Sync.
                </p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setConfirmDisconnect(true)}
                  disabled={disconnecting}
                  style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)" }}
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
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
                  {/* Kept as a <button>: dashboard.css never clears the
                      default underline on <a>, so styling a link as .btn
                      would not match the rest of the page. */}
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => window.open(`${API_ORIGIN}/buildvolt-woocommerce.zip`, "_blank", "noopener")}
                  >
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
                  <button type="button" className={`btn btn-primary btn-sm${generating ? " is-loading" : ""}`} onClick={generateKey} disabled={generating}>
                    {generating ? "Generating…" : status?.hasKey ? "Generate new key" : "Generate key"}
                  </button>
                  {status?.hasKey && !generating && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
                      Generating a new key replaces the current one — you will need to paste it into the plugin again.
                    </div>
                  )}
                  {status?.secret && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all" }}>
                        {status.secret}
                      </div>
                      <button type="button" className="btn btn-sm" onClick={() => copy(status.secret || "", "Secret key")}>
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "ospos" && (
        <div className="card" id="ospos-section">
          {osposError && (
            <div className="alert alert-error show" style={{ marginBottom: 16 }}>
              {osposError}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0 }}>OSPOS Auto-Sync</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                Connect Open Source Point of Sale — BuildVolt pulls your catalog automatically every few hours.
                Nothing to install or schedule on your own server beyond one file.
              </p>
            </div>
            <div
              style={{
                marginLeft: "auto",
                padding: "5px 14px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background: osposStatus?.osposConnected ? "rgba(5,150,105,0.12)" : "rgba(231,76,60,0.12)",
                color: osposStatus?.osposConnected ? "var(--success)" : "var(--danger)",
                border: `1px solid ${osposStatus?.osposConnected ? "rgba(5,150,105,0.3)" : "rgba(231,76,60,0.3)"}`,
              }}
            >
              {!osposStatus && !osposError ? "● Checking…" : osposStatus?.osposConnected ? "● Connected" : "● Not Connected"}
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border)", margin: "20px 0" }} />

          {osposStatus?.osposConnected ? (
            <div>
              <div style={{ ...responsiveCols(150), marginBottom: 20, gap: 12 }}>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Export URL</div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500, wordBreak: "break-all" }}>{osposStatus.exportUrl || "—"}</div>
                </div>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Products Synced</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--success)" }}>{osposStatus.productCount}</div>
                </div>
                <div style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4, textTransform: "uppercase" }}>Last Synced</div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>{osposStatus.lastSync ? new Date(osposStatus.lastSync).toLocaleString() : "Never"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" className={`btn btn-sm${pullingNow ? " is-loading" : ""}`} onClick={pullNow} disabled={pullingNow}>
                  {pullingNow ? "Syncing…" : "Sync now"}
                </button>
                <p style={{ fontSize: 12, color: "var(--muted)", padding: "8px 0", flex: 1, minWidth: 220 }}>
                  Runs automatically every few hours — use this to sync immediately instead of waiting.
                </p>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setConfirmOsposDisconnect(true)}
                  disabled={osposDisconnecting}
                  style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)" }}
                >
                  {osposDisconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <StepCircle n={1} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Download the export file</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    One PHP file — no OSPOS or server expertise needed to use it.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => window.open(`${API_ORIGIN}/buildvolt-export.php`, "_blank", "noopener")}
                  >
                    Download buildvolt-export.php
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <StepCircle n={2} muted />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Generate a secret key</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    Open the downloaded file and paste this key into <code>$BUILDVOLT_KEY</code> at the top. (Already
                    generated a key for WooCommerce? The same one works here too.)
                  </div>
                  <button type="button" className={`btn btn-primary btn-sm${generating ? " is-loading" : ""}`} onClick={generateKey} disabled={generating}>
                    {generating ? "Generating…" : status?.hasKey ? "Generate new key" : "Generate key"}
                  </button>
                  {status?.secret && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200, padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "var(--font-mono)", fontSize: 12, wordBreak: "break-all" }}>
                        {status.secret}
                      </div>
                      <button type="button" className="btn btn-sm" onClick={() => copy(status.secret || "", "Secret key")}>
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                <StepCircle n={3} muted />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Upload it to your OSPOS server</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    Put it in the same folder as OSPOS's own <code>index.php</code> (usually a folder called{" "}
                    <code>public</code>) via FTP or your hosting's File Manager.
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <StepCircle n={4} muted />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Paste the URL here</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    e.g. https://your-client-site.com/buildvolt-export.php — BuildVolt takes it from here.
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="url"
                      placeholder="https://your-client-site.com/buildvolt-export.php"
                      value={exportUrlInput}
                      onChange={(e) => setExportUrlInput(e.target.value)}
                      style={{ ...readonlyInputStyle, background: "var(--surface)", flex: 1, minWidth: 220 }}
                    />
                    <button
                      type="button"
                      className={`btn btn-primary btn-sm${savingExportUrl ? " is-loading" : ""}`}
                      onClick={saveExportUrl}
                      disabled={savingExportUrl || !exportUrlInput.trim()}
                    >
                      {savingExportUrl ? "Connecting & syncing…" : "Connect & sync now"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disconnecting breaks a live storefront integration — confirm first. */}
      <div className={`modal-bg${confirmDisconnect ? " open" : ""}`}>
        <div className="modal">
          <h2>Disconnect WooCommerce?</h2>
          <p>
            BuildVolt will stop syncing products from WordPress. Your widget keeps using the catalog it already
            has, and customers lose one-click cart checkout. You can reconnect any time by generating a new key.
          </p>
          <div className="modal-btns">
            <button
              type="button"
              className={`btn btn-danger${disconnecting ? " is-loading" : ""}`}
              onClick={disconnect}
              disabled={disconnecting}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
            <button type="button" className="btn" onClick={() => setConfirmDisconnect(false)} disabled={disconnecting}>
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className={`modal-bg${confirmOsposDisconnect ? " open" : ""}`}>
        <div className="modal">
          <h2>Disconnect OSPOS?</h2>
          <p>
            BuildVolt will stop pulling products from OSPOS. Your widget keeps using the catalog it already has.
            You can reconnect any time by pasting the export URL again.
          </p>
          <div className="modal-btns">
            <button
              type="button"
              className={`btn btn-danger${osposDisconnecting ? " is-loading" : ""}`}
              onClick={disconnectOspos}
              disabled={osposDisconnecting}
            >
              {osposDisconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
            <button type="button" className="btn" onClick={() => setConfirmOsposDisconnect(false)} disabled={osposDisconnecting}>
              Cancel
            </button>
          </div>
        </div>
      </div>
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
