import { useState } from "react";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { getWidgetScriptUrl } from "../../../lib/config";

export default function EmbedTab() {
  const { store } = useStoreAuth();
  const toast = useToast();
  const [live, setLive] = useState(localStorage.getItem("bb_widget_live") === "1");
  const snippet = store ? getWidgetScriptUrl(store.storeId) : "";

  function copy() {
    navigator.clipboard.writeText(snippet);
    localStorage.setItem("bb_embed_copied", "1");
    toast.success("Copied", "Embed code copied to clipboard.");
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
            <h3>Verify &amp; mark live</h3>
            <p>Open your site, confirm the widget opens, then mark live here so onboarding stays accurate.</p>
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
          <button className="btn btn-primary btn-sm" onClick={copy}>
            Copy embed code
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              localStorage.setItem("bb_widget_live", "1");
              setLive(true);
            }}
            style={{ background: "var(--success-bg)", color: "var(--success)", border: "1px solid rgba(5,150,105,0.3)" }}
          >
            Mark as Live
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              localStorage.removeItem("bb_widget_live");
              setLive(false);
            }}
            style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--border)" }}
          >
            Reset
          </button>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: live ? "var(--success)" : "var(--muted)" }}>
          {live ? "Marked as live." : "Not marked as live yet."}
        </div>
      </div>
    </div>
  );
}
