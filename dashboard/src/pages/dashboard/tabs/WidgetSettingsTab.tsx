import { useEffect, useState } from "react";
import { dashboardApi, WIDGET_DEFAULTS } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { isLikelyValidPakistaniMobile } from "../../../lib/phone";
import { ApiError } from "../../../lib/api";

function Alert({ msg, type }: { msg: string | null; type: "success" | "error" | null }) {
  if (!msg) return <div className="alert" />;
  return <div className={`alert alert-${type} show`}>{msg}</div>;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export default function WidgetSettingsTab() {
  return (
    <div>
      <div className="section-title">Widget Settings</div>
      <div className="section-sub">Customize how your widget looks and what it says.</div>

      <div className="two-col">
        <BrandingCard />
        <WhatsappCard />
        <PreviewCard />
      </div>

      <WidgetTextCard />
      <WidgetToggleCard />
    </div>
  );
}

function BrandingCard() {
  const { token, store, refresh } = useStoreAuth();
  const [color, setColor] = useState(store?.brandColor || "#4f46e5");
  const [currency, setCurrency] = useState(store?.currency || "PKR");
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function save() {
    if (!token) return;
    // The server stores brand_color verbatim and the widget drops it
    // straight into CSS, so a malformed value silently breaks the widget's
    // colours rather than erroring anywhere.
    if (!HEX_RE.test(color.trim())) {
      setAlert({ msg: "Brand colour must be a 6-digit hex value, e.g. #4f46e5.", type: "error" });
      return;
    }
    setBusy(true);
    setAlert(null);
    try {
      const data = await dashboardApi.settings.saveBranding(token, color.trim(), currency);
      setAlert({ msg: data.message, type: "success" });
      refresh();
    } catch (err) {
      setAlert({
        msg: err instanceof ApiError ? err.message : "Could not save your branding settings.",
        type: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Brand Colors &amp; Currency</h2>
      <p style={{ marginBottom: 20 }}>Match the widget to your store's look.</p>
      <div className="form-group">
        <label className="form-label" htmlFor="brand-color-text">
          Brand Color
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="color"
            aria-label="Pick a brand colour"
            value={HEX_RE.test(color) ? color : "#4f46e5"}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 50, height: 40, border: "none", background: "none", cursor: "pointer", padding: 0 }}
          />
          <input
            id="brand-color-text"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ flex: 1 }}
            placeholder="#4f46e5"
            maxLength={7}
          />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="brand-currency">
          Currency
        </label>
        <select id="brand-currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="PKR">PKR – Pakistani Rupee</option>
          <option value="USD">USD – US Dollar</option>
          <option value="AED">AED – UAE Dirham</option>
        </select>
      </div>
      <button type="button" className={`btn btn-primary${busy ? " is-loading" : ""}`} onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save Branding"}
      </button>
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function WhatsappCard() {
  const { token, store, refresh } = useStoreAuth();
  const [number, setNumber] = useState(store?.whatsappNumber || "");
  const [savingNumber, setSavingNumber] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const saved = !!(store?.whatsappVerified && store?.whatsappNumber);
  const clearing = !number.trim() && !!store?.whatsappNumber;

  async function saveNumber() {
    if (!token) return;
    if (number.trim() && !isLikelyValidPakistaniMobile(number)) {
      setAlert({
        msg: "That doesn't look like a valid Pakistani mobile number. Use 03XXXXXXXXX or +923XXXXXXXXX.",
        type: "error",
      });
      return;
    }
    setSavingNumber(true);
    setAlert(null);
    try {
      const data = await dashboardApi.whatsapp.save(token, number.trim());
      setAlert({ msg: data.message || "Saved.", type: data.success ? "success" : "error" });
      refresh();
    } catch (err) {
      setAlert({
        msg: err instanceof ApiError ? err.message : "Could not save your WhatsApp number.",
        type: "error",
      });
    } finally {
      setSavingNumber(false);
    }
  }

  return (
    <div className="card">
      <h2>Order via WhatsApp</h2>
      <p style={{ marginBottom: 20 }}>
        Lets customers send a build straight to your WhatsApp when they don't check out through WooCommerce.
      </p>
      <div className="form-group">
        <label className="form-label" htmlFor="whatsapp-number">
          WhatsApp Number
        </label>
        {/* type stays "text": dashboard.css only styles input[type=text|
            email|password|number], so type="tel" would render unstyled.
            inputMode still gives phones the numeric keypad. */}
        <input
          id="whatsapp-number"
          type="text"
          inputMode="tel"
          autoComplete="tel"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="03001234567"
        />
      </div>
      <button
        type="button"
        className={`btn btn-primary${savingNumber ? " is-loading" : ""}`}
        onClick={saveNumber}
        disabled={savingNumber}
      >
        {savingNumber ? "Saving…" : clearing ? "Remove WhatsApp Number" : "Save WhatsApp Number"}
      </button>

      {clearing && (
        <div style={{ marginTop: 12, fontSize: 12, color: "var(--warning)", lineHeight: 1.5 }}>
          Clearing this removes your only WhatsApp ordering method. If WooCommerce isn't connected, your widget
          can no longer take orders and you'll be asked to add a number again.
        </div>
      )}
      {saved && !clearing && (
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: "var(--success)" }}>Saved</div>
      )}
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function PreviewCard() {
  const { store } = useStoreAuth();
  const color = store?.brandColor || "#4f46e5";
  const title = store?.widgetTitle || WIDGET_DEFAULTS.widgetTitle;
  return (
    <div className="card">
      <h2>Widget Preview</h2>
      <p style={{ marginBottom: 16 }}>Live preview of your widget button.</p>
      <div style={{ background: "var(--surface)", borderRadius: 10, padding: 40, textAlign: "center", position: "relative", height: 160 }}>
        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            width: 52,
            height: 52,
            background: color,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(124,106,247,0.5)",
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div style={{ position: "absolute", bottom: 82, right: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", maxWidth: "calc(100% - 32px)", overflow: "hidden", textOverflow: "ellipsis" }}>
          {/* Was hardcoded to "BuildVolt" even though the title is editable
              directly below — the preview contradicted the form. */}
          <span style={{ fontWeight: 700, color: "var(--text)" }}>{title}</span>
          <br />
          PC Build Recommender
        </div>
      </div>
    </div>
  );
}

function WidgetTextCard() {
  const { token, store, refresh } = useStoreAuth();
  const toast = useToast();
  // /me already returns widget_title / welcome_msg / button_text / widget_bg
  // (they live on the stores row — see widgetDB.getSettings), so read them
  // off the session instead of firing a second /me on mount.
  const [title, setTitle] = useState(store?.widgetTitle || WIDGET_DEFAULTS.widgetTitle);
  const [welcome, setWelcome] = useState(store?.welcomeMsg || WIDGET_DEFAULTS.welcomeMsg);
  const [buttonText, setButtonText] = useState(store?.buttonText || WIDGET_DEFAULTS.buttonText);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!store) return;
    setTitle(store.widgetTitle || WIDGET_DEFAULTS.widgetTitle);
    setWelcome(store.welcomeMsg || WIDGET_DEFAULTS.welcomeMsg);
    setButtonText(store.buttonText || WIDGET_DEFAULTS.buttonText);
  }, [store]);

  async function save() {
    if (!token) return;
    // PUT /widget-settings rejects any blank field with "All fields are
    // required" — the old form started `welcome` as "" and offered no way
    // to discover why saving failed.
    const cleanTitle = title.trim();
    const cleanWelcome = welcome.trim();
    const cleanButton = buttonText.trim();
    if (!cleanTitle || !cleanWelcome || !cleanButton) {
      toast.error("Missing fields", "Widget title, welcome message and button text are all required.");
      return;
    }
    setBusy(true);
    try {
      const data = await dashboardApi.settings.saveWidgetText(
        token,
        cleanTitle,
        cleanWelcome,
        cleanButton,
        // Pass the stored background through: the server defaults a missing
        // widgetBg back to #1a1d27, so omitting it reset the widget
        // background every time the text was saved.
        store?.widgetBg || WIDGET_DEFAULTS.widgetBg,
      );
      if (data.success) {
        toast.success("Saved", data.message);
        refresh();
      } else {
        toast.error("Error", data.error || "Could not save your widget text.");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not save your widget text.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Widget Text &amp; Content</h2>
      <p style={{ marginBottom: 24 }}>Customize what your customers see inside the widget.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 24 }}>
        <div>
          <div className="form-group">
            <label className="form-label" htmlFor="widget-title">
              Widget Title
            </label>
            <input id="widget-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="widget-button-text">
              Button Text
            </label>
            <input id="widget-button-text" type="text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={20} />
          </div>
        </div>
        <div>
          <div className="form-group">
            <label className="form-label" htmlFor="widget-welcome">
              Welcome Message
            </label>
            <textarea id="widget-welcome" value={welcome} onChange={(e) => setWelcome(e.target.value)} maxLength={200} rows={4} />
          </div>
        </div>
      </div>
      <button type="button" className={`btn btn-primary${busy ? " is-loading" : ""}`} onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save Widget Text"}
      </button>
    </div>
  );
}

function WidgetToggleCard() {
  const { token, store, refresh } = useStoreAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // This used to be handed `wooConnected || whatsappVerified` — i.e. whether
  // the store *could* enable the widget, not whether it actually was
  // enabled. A store that had turned its widget off still saw the box
  // ticked. stores.widget_enabled is the real flag.
  const enabled = store?.widgetEnabled !== false;
  const hasOrderMethod = !!(store?.wooConnected || store?.whatsappVerified);

  async function toggle(next: boolean) {
    if (!token) return;
    setBusy(true);
    try {
      const data = await dashboardApi.settings.toggleWidget(token, next);
      if (data.success) {
        toast.success("Saved", data.message);
        await refresh();
      } else {
        toast.error("Could not update widget", data.error || "Please try again.");
      }
    } catch (err) {
      // The server refuses to enable a widget with no ordering method and
      // explains why — surface that message rather than a generic one.
      toast.error("Error", err instanceof ApiError ? err.message : "Could not update your widget status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>Widget Status</h2>
      <p style={{ marginBottom: 8 }}>
        {enabled
          ? "Your widget is on and will show on any page where you've installed the embed snippet."
          : "Your widget is off and will not appear on your storefront."}
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", marginTop: 10, cursor: busy ? "wait" : "pointer" }}>
        <input type="checkbox" checked={enabled} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
        Widget enabled
      </label>
      {!hasOrderMethod && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
          Connect WooCommerce or save a WhatsApp number above before turning the widget on — customers need a way
          to actually place their order.
        </div>
      )}
    </div>
  );
}
