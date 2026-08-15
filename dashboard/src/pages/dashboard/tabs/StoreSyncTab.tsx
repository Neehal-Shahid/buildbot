import { useState } from "react";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { getStoredMode, hasChosenMode, setStoredMode, type WebsiteMode } from "../../../lib/storeMode";

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

export default function StoreSyncTab({
  onNavigate,
  onModeChange,
}: {
  onNavigate: (tab: "products") => void;
  onModeChange: () => void;
}) {
  const { store } = useStoreAuth();
  const toast = useToast();
  const storeId = store?.storeId || "";

  // Two separate ideas, previously conflated into one: "confirmed" is the
  // choice actually saved (what the step-1 checkmark reflects), "picked" is
  // a card the owner has clicked on this visit but not yet confirmed.
  // Before this, clicking a card saved it immediately with no confirmation
  // step, and "custom" appeared pre-selected even for someone who hadn't
  // touched anything yet — a single click (or even landing here and
  // clicking around) silently finished Step 1 with no explicit "yes, this
  // one" moment and no way to move on to Step 2 afterwards.
  const [confirmed, setConfirmed] = useState<WebsiteMode | null>(
    hasChosenMode(storeId) ? getStoredMode(storeId) : null,
  );
  const [picked, setPicked] = useState<WebsiteMode | null>(null);
  const displayed = picked ?? confirmed;
  const isChange = picked !== null && picked !== confirmed;

  async function copy(value: string, label: string) {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      toast.success("Copied", `${label} copied to clipboard.`);
    } catch {
      toast.error("Couldn't copy automatically", `Select your ${label.toLowerCase()} and copy it manually.`);
    }
  }

  function confirmChoice() {
    if (!storeId || !picked) return;
    setStoredMode(storeId, picked);
    setConfirmed(picked);
    setPicked(null);
    onModeChange();
    onNavigate("products");
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
    const active = displayed === value;
    const justPicked = picked === value && picked !== confirmed;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setPicked(value)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPicked(value))}
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
          {active && (
            <span className={`badge ${justPicked ? "badge-warning" : "badge-success"}`}>
              {justPicked ? "Picked — confirm below" : "Selected"}
            </span>
          )}
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

      {!displayed && (
        <div className="alert alert-error show" style={{ marginBottom: 16 }}>
          Pick one of the options below to continue.
        </div>
      )}

      <div style={responsiveCols(280)}>
        <OptionCard
          value="custom"
          title="Custom Website"
          desc="Any platform — plain HTML, Shopify, a page builder, or WordPress without WooCommerce."
          bullets={[
            "You paste one script tag yourself (Step 3 gives you the exact snippet)",
            "Works on literally any site that lets you edit the page HTML",
            "Products come from the methods in Step 2 — add manually or upload a file",
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
        {isChange ? (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 6 }}>Confirm your choice</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginBottom: 12 }}>
              You picked <strong style={{ color: "var(--text)" }}>{picked === "woo" ? "WordPress / WooCommerce" : "Custom Website"}</strong>.
              Confirm to save it and move on to Products.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={confirmChoice}>
                Confirm &amp; continue to Products
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setPicked(null)}>
                Cancel
              </button>
            </div>
          </>
        ) : confirmed ? (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 6 }}>Next: add your products</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55, marginBottom: 12 }}>
              Head to the <strong style={{ color: "var(--text)" }}>Products</strong> tab (Step 2) — add products
              manually, or upload a CSV/Excel/Word/PDF file. You can use more than one method; we'll ask whether to
              add to your list or replace it whenever that matters.
            </p>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => onNavigate("products")}>
              Continue to Products →
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 6 }}>Choose a website type first</h2>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}>
              Pick Custom Website or WordPress / WooCommerce above, then confirm — that unlocks Step 2 (Products).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
