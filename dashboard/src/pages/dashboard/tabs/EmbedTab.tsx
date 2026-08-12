import { useState } from "react";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { getWidgetScriptUrl } from "../../../lib/config";
import { dashboardApi } from "../../../lib/dashboardApi";
import { ApiError } from "../../../lib/api";

export default function EmbedTab() {
  const { token, store, refresh } = useStoreAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const snippet = store ? getWidgetScriptUrl(store.storeId) : "";

  // The real signal, not a local flag: the widget only serves customers
  // when widget_enabled is on AND there's a way to actually order
  // (see /widget-toggle and /store-config in server/routes/auth.js).
  const hasOrderMethod = !!(store?.wooConnected || store?.whatsappVerified);
  const enabled = store?.widgetEnabled !== false;
  const live = enabled && hasOrderMethod;

  async function copy() {
    if (!snippet) return;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(snippet);
      toast.success("Copied", "Embed code copied to clipboard.");
    } catch {
      // Happens on non-HTTPS origins and older mobile browsers, where the
      // old code silently claimed success.
      toast.error("Couldn't copy automatically", "Select the snippet above and copy it manually.");
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

  return (
    <div>
      <div className="section-title">Install Widget</div>
      <div className="section-sub">
        One script tag loads the floating assistant on your site. Copy it once, paste before <code>&lt;/body&gt;</code>,
        then confirm it opens on your storefront.
      </div>

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
            <h3>Paste in theme</h3>
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

      <div className="card">
        <h2>Your install snippet</h2>
        <p style={{ marginBottom: 14 }}>
          Paste once, just above <code>&lt;/body&gt;</code>. Same snippet works on custom HTML, WordPress theme
          footer, or Shopify <code>theme.liquid</code>.
        </p>
        <div className="embed-box" style={{ marginBottom: 12 }}>
          {snippet}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={copy}>
            Copy embed code
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Widget status</h2>
        <p style={{ marginBottom: 14 }}>
          {live
            ? "Your widget is enabled and serving build recommendations to customers."
            : enabled
              ? "Your widget is enabled, but customers have no way to place an order yet — connect WooCommerce or add a WhatsApp number in Widget Settings."
              : "Your widget is turned off, so it will not appear on your storefront."}
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div className={`badge ${live ? "badge-success" : enabled ? "badge-warning" : "badge-danger"}`}>
            {live ? "Live" : enabled ? "Needs an order method" : "Disabled"}
          </div>
          {/* No .is-loading here: its spinner is drawn in white, which is
              invisible on the plain (white) .btn — the changed label plus
              the .btn:disabled dimming carries the loading state instead. */}
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setWidget(!enabled)}
            disabled={busy}
          >
            {busy ? "Saving…" : enabled ? "Turn widget off" : "Turn widget on"}
          </button>
        </div>
      </div>
    </div>
  );
}
