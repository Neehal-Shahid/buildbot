import { useEffect, useState } from "react";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { getWidgetScriptUrl, API_ORIGIN } from "../../../lib/config";
import { dashboardApi } from "../../../lib/dashboardApi";
import { ApiError } from "../../../lib/api";
import { getStoredMode, setStoredMode, isSourceMismatched, type WebsiteMode } from "../../../lib/storeMode";

interface PluginStatus {
  hasKey: boolean;
  secret: string | null;
  wooConnected: boolean;
  wooUrl: string;
  lastSync: string | null;
  productCount: number;
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

export default function EmbedTab() {
  const { token, store, refresh } = useStoreAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const storeId = store?.storeId || "";
  const [mode, setMode] = useState<WebsiteMode>(getStoredMode(storeId));

  // How many products exist right now, regardless of which method(s) put
  // them there — the install steps below are gated on this being > 0. Uses
  // the same /analytics endpoint HomeTab already relies on for this number.
  const [productCount, setProductCount] = useState<number | null>(null);
  useEffect(() => {
    if (!token) return;
    dashboardApi
      .analytics(token, 0)
      .then((data) => setProductCount(data.productCount?.count ?? 0))
      .catch(() => setProductCount(0));
  }, [token]);

  const snippet = store ? getWidgetScriptUrl(store.storeId) : "";
  const hasProducts = (productCount ?? 0) > 0;
  // "Add products first" makes sense when the catalog is something the
  // owner fills in via Products (manual/file/OSPOS) — but when WooCommerce
  // IS the data source, connecting the plugin below is exactly how
  // products show up in the first place. Gating that connection step on
  // already having products would be a deadlock: no products without the
  // plugin, no plugin without products.
  const pluginBringsOwnData = mode === "woo" && store?.dataSource === "woo";

  // The confirmed data source no longer fits the website type chosen here
  // in Step 1 (e.g. switched from WordPress to Custom after WooCommerce
  // was already the source) — Products (Step 2) already surfaces this and
  // lets the store owner re-pick, but without this check here too, a
  // stale product count from the now-invalid source could still make this
  // step look installable when the live widget wouldn't actually have
  // real products to show.
  const sourceMismatch = isSourceMismatched(
    storeId,
    store?.dataSource ?? "manual",
    !!store?.dataSourceConfirmed,
  );

  // The real signal, not a local flag: the widget only serves customers
  // when widget_enabled is on AND there's a way to actually order
  // (see /widget-toggle and /store-config in server/routes/auth.js).
  const hasOrderMethod = !!(store?.wooConnected || store?.whatsappVerified);
  const enabled = store?.widgetEnabled !== false;
  const live = enabled && hasOrderMethod;
  // Set server-side whenever the public /store-config/:storeId endpoint is
  // hit — only a real, embedded widget.js ever calls it, so this is actual
  // evidence the snippet was pasted and loaded, not just "you could
  // technically go live" like the checks above.
  const installed = !!store?.widgetLastSeen;

  async function copy(value: string, label: string) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      toast.success("Copied", `${label} copied to clipboard.`);
    } catch {
      toast.error("Couldn't copy automatically", `Select the ${label.toLowerCase()} and copy it manually.`);
    }
  }

  async function setWidget(next: boolean) {
    if (!token) return;
    setBusy(true);
    try {
      await dashboardApi.settings.toggleWidget(token, next);
      toast.success(next ? "Widget enabled" : "Widget disabled", next ? "Customers can now use it on your storefront." : "It no longer shows on your storefront.");
      await refresh();
    } catch (err) {
      toast.error(
        "Error",
        err instanceof ApiError ? err.message : "Could not update your widget status.",
      );
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: WebsiteMode) {
    if (!storeId) return;
    setMode(next);
    setStoredMode(storeId, next);
  }

  return (
    <div>
      <div className="section-title">Install Widget — Step 3</div>
      <div className="section-sub">
        {mode === "woo"
          ? "You chose WordPress / WooCommerce in Step 1 — install the plugin below."
          : "You chose Custom Website in Step 1 — copy the script below onto your site."}{" "}
        Wrong choice?{" "}
        <span
          role="button"
          tabIndex={0}
          onClick={() => switchMode(mode === "woo" ? "custom" : "woo")}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && switchMode(mode === "woo" ? "custom" : "woo")}
          style={{ color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}
        >
          Switch to {mode === "woo" ? "Custom Website" : "WordPress / WooCommerce"}
        </span>
        .
      </div>

      {sourceMismatch ? (
        <div className="alert alert-error show" style={{ marginBottom: 16 }}>
          Your data source no longer matches this website type. Go to <strong>Products</strong> (Step 2) and pick a
          data source that fits before installing the widget.
        </div>
      ) : (
        !hasProducts &&
        productCount !== null &&
        !pluginBringsOwnData && (
          <div className="alert alert-error show" style={{ marginBottom: 16 }}>
            Your product catalog is empty — the widget can't be installed until it has something to recommend.
            Go to <strong>Products</strong> (Step 2) and add products, upload a file, or import from OSPOS first.
          </div>
        )
      )}

      {sourceMismatch ? null : mode === "custom" ? (
        <ScriptGuide
          snippet={snippet}
          canInstall={hasProducts}
          live={live}
          enabled={enabled}
          hasOrderMethod={hasOrderMethod}
          installed={installed}
          busy={busy}
          onCopy={copy}
          onToggle={setWidget}
        />
      ) : (
        <WooGuide
          canInstall={hasProducts}
          canConnect={hasProducts || pluginBringsOwnData}
          live={live}
          enabled={enabled}
          hasOrderMethod={hasOrderMethod}
          installed={installed}
          busy={busy}
          onCopy={copy}
          onToggle={setWidget}
        />
      )}
    </div>
  );
}

function ScriptGuide({
  snippet,
  canInstall,
  live,
  enabled,
  hasOrderMethod,
  installed,
  busy,
  onCopy,
  onToggle,
}: {
  snippet: string;
  canInstall: boolean;
  live: boolean;
  enabled: boolean;
  hasOrderMethod: boolean;
  installed: boolean;
  busy: boolean;
  onCopy: (v: string, label: string) => void;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div>
      <div className="embed-steps">
        <div className="embed-step">
          <div className="embed-step-num">1</div>
          <div>
            <h3>Copy snippet</h3>
            <p>Use the button below to copy your store-specific script (includes your store ID).</p>
          </div>
        </div>
        <div className="embed-step">
          <div className="embed-step-num">2</div>
          <div>
            <h3>Paste in your site</h3>
            <p>Add it to your global layout so it loads on every page customers visit.</p>
          </div>
        </div>
        <div className="embed-step">
          <div className="embed-step-num">3</div>
          <div>
            <h3>Turn the widget on</h3>
            <p>Open your site, confirm the widget opens, and keep it enabled below so customers can use it.</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ opacity: canInstall ? 1 : 0.5 }}>
        <h2>Your install snippet</h2>
        <p style={{ marginBottom: 14 }}>
          Paste once, just above <code>&lt;/body&gt;</code>. Same snippet works on custom HTML, WordPress theme
          footer, Shopify <code>theme.liquid</code>, or any other page you can edit.
        </p>
        <div className="embed-box" style={{ marginBottom: 12 }}>
          {snippet}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onCopy(snippet, "Embed code")} disabled={!canInstall}>
            Copy embed code
          </button>
        </div>
      </div>

      <WidgetStatusCard canInstall={canInstall} live={live} enabled={enabled} hasOrderMethod={hasOrderMethod} installed={installed} mode="custom" busy={busy} onToggle={onToggle} />
    </div>
  );
}

function WooGuide({
  canInstall,
  canConnect,
  live,
  enabled,
  hasOrderMethod,
  installed,
  busy,
  onCopy,
  onToggle,
}: {
  canInstall: boolean;
  // Whether the plugin download/connect steps themselves should be
  // enabled — true whenever there are already products, OR when
  // WooCommerce is the data source (in which case connecting the plugin
  // is how products show up, so it can't wait on products existing first).
  canConnect: boolean;
  live: boolean;
  enabled: boolean;
  hasOrderMethod: boolean;
  installed: boolean;
  busy: boolean;
  onCopy: (v: string, label: string) => void;
  onToggle: (next: boolean) => void;
}) {
  const { token, store } = useStoreAuth();
  const toast = useToast();
  const [status, setStatus] = useState<PluginStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  function load() {
    if (!token) return;
    setError(null);
    dashboardApi.plugin
      .status(token)
      .then(setStatus)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Could not load your WooCommerce connection status.");
      });
  }

  useEffect(load, [token]);

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

  const responsiveCols = (min: number) => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`,
    gap: 16,
  });

  return (
    <div>
      {error && (
        <div className="alert alert-error show" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <div className="card" id="woo-section" style={{ opacity: canConnect ? 1 : 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>WooCommerce Plugin</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
              Installs the widget on your site for you, and can auto-sync WooCommerce products too.
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

        {status?.wooConnected && store?.dataSource && store.dataSource !== "woo" && (
          <div
            style={{
              marginBottom: 20,
              padding: "10px 14px",
              background: "var(--warning-bg)",
              border: "1px solid var(--warning-border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--text)",
              lineHeight: 1.55,
            }}
          >
            The plugin is connected and delivering the widget, but your{" "}
            <strong>data source</strong> in Products (Step 2) is set to {store.dataSource === "ospos" ? "OSPOS" : "Dashboard"},
            not WooCommerce — so products aren't syncing from here. That's expected if you're deliberately sourcing
            your catalog elsewhere.
          </div>
        )}

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
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.open(`${API_ORIGIN}/buildvolt-woocommerce.zip`, "_blank", "noopener")}
                  disabled={!canConnect}
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
                <button type="button" className={`btn btn-primary btn-sm${generating ? " is-loading" : ""}`} onClick={generateKey} disabled={generating || !canConnect}>
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
                    <button type="button" className="btn btn-sm" onClick={() => onCopy(status.secret || "", "Secret key")}>
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <WidgetStatusCard canInstall={canInstall} live={live} enabled={enabled} hasOrderMethod={hasOrderMethod} installed={installed} mode="woo" busy={busy} onToggle={onToggle} />

      {/* Disconnecting breaks a live storefront integration — confirm first. */}
      <div className={`modal-bg${confirmDisconnect ? " open" : ""}`}>
        <div className="modal">
          <h2>Disconnect WooCommerce?</h2>
          <p>
            BuildVolt will stop syncing products from WordPress and the widget will no longer be injected
            automatically. Your widget keeps using the catalog it already has. You can reconnect any time by
            generating a new key.
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
    </div>
  );
}

function WidgetStatusCard({
  canInstall,
  live,
  enabled,
  hasOrderMethod,
  installed,
  mode,
  busy,
  onToggle,
}: {
  canInstall: boolean;
  live: boolean;
  enabled: boolean;
  hasOrderMethod: boolean;
  installed: boolean;
  mode: WebsiteMode;
  busy: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>Widget status</h2>
      <p style={{ marginBottom: 14 }}>
        {!canInstall
          ? "Add products first — the toggle below stays off until your catalog has at least one item."
          : !installed
            ? mode === "woo"
              ? "We haven't detected the widget on your site yet — make sure the BuildVolt plugin is installed, activated, and connected above, then open your site once so we can confirm it's loading."
              : "We haven't detected the snippet on your site yet — paste it in, then open your site once so we can confirm it's loading."
            : live
              ? "Your widget is enabled and serving build recommendations to customers."
              : enabled
                ? "Your widget is enabled, but customers have no way to place an order yet — connect WooCommerce or add a WhatsApp number in Widget Settings."
                : "Your widget is turned off, so it will not appear on your storefront."}
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div className={`badge ${live && installed ? "badge-success" : installed || enabled ? "badge-warning" : "badge-danger"}`}>
          {!installed ? "Not detected yet" : live ? "Live" : enabled ? "Needs an order method" : "Disabled"}
        </div>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => onToggle(!enabled)}
          disabled={busy || (!canInstall && !enabled)}
        >
          {busy ? "Saving…" : enabled ? "Turn widget off" : "Turn widget on"}
        </button>
      </div>
      {!hasOrderMethod && canInstall && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
          Also add a WhatsApp number or connect WooCommerce in Widget Settings, so customers have a way to order.
        </div>
      )}
    </div>
  );
}
