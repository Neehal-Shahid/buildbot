import { useState } from "react";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { getStoredMode, setStoredMode, type WebsiteMode } from "../../../lib/storeMode";

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
  const { store } = useStoreAuth();
  const toast = useToast();
  const [mode, setMode] = useState<WebsiteMode>(getStoredMode());

  async function copy(value: string, label: string) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      toast.success("Copied", `${label} copied to clipboard.`);
    } catch {
      toast.error("Couldn't copy automatically", `Select your ${label.toLowerCase()} and copy it manually.`);
    }
  }

  function choose(next: WebsiteMode) {
    setMode(next);
    setStoredMode(next);
    toast.success(
      next === "woo" ? "WordPress selected" : "Custom website selected",
      "Head to Install Widget once your products are ready — that's where you'll finish setup.",
    );
  }

  const OptionCard = ({
    value,
    title,
    desc,
    bullets,
  }: {
    value: WebsiteMode;
    title: string;
    desc: string;
    bullets: string[];
  }) => {
    const active = mode === value;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => choose(value)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), choose(value))}
        className="card"
        style={{
          cursor: "pointer",
          textAlign: "left",
          border: active ? "2px solid var(--accent)" : "1px solid var(--border)",
          background: active ? "var(--accent-bg)" : undefined,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          {active && <span className="badge badge-success">Selected</span>}
        </div>
        <p style={{ marginBottom: 12 }}>{desc}</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <div className="section-title">Store &amp; sync — Step 1</div>
      <div className="section-sub">
        Where does your widget need to live? This decides how you'll install it in Step 3 (Install Widget). You can
        change this any time — nothing below is permanent.
      </div>

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

      <div style={responsiveCols(280)}>
        <OptionCard
          value="custom"
          title="Custom Website"
          desc="Any platform — plain HTML, Shopify, a page builder, or WordPress without WooCommerce."
          bullets={[
            "You paste one script tag yourself (Step 3 gives you the exact snippet)",
            "Works on literally any site that lets you edit the page HTML",
            "Products come from the methods in Step 2 — add manually, upload a file, or import from OSPOS",
          ]}
        />
        <OptionCard
          value="woo"
          title="WordPress / WooCommerce"
          desc="Your store runs on WordPress with the WooCommerce plugin."
          bullets={[
            "Install the BuildVolt WordPress plugin (Step 3 walks you through it)",
            "The plugin installs the widget on your site for you — no manual script needed",
            "It can also auto-sync your WooCommerce products, alongside anything you add in Step 2",
          ]}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginBottom: 6 }}>Next: add your products</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
          Head to the <strong style={{ color: "var(--text)" }}>Products</strong> tab (Step 2) — add products
          manually, upload a CSV/Excel/Word/PDF file, or import from OSPOS. You can use more than one method; we'll
          ask whether to add to your list or replace it whenever that matters.
        </p>
      </div>
    </div>
  );
}
