import { useEffect, useState } from "react";
import { dashboardApi } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { isLikelyValidPakistaniMobile } from "../../../lib/phone";
import { ApiError } from "../../../lib/api";

function Alert({ msg, type }: { msg: string | null; type: "success" | "error" | null }) {
  if (!msg) return <div className="alert" />;
  return <div className={`alert alert-${type} show`}>{msg}</div>;
}

export default function WidgetSettingsTab() {
  const { store, refresh } = useStoreAuth();

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
      <WidgetToggleCard enabled={!!(store?.wooConnected || store?.whatsappVerified)} onChanged={refresh} />
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
    setBusy(true);
    try {
      const data = await dashboardApi.settings.saveBranding(token, color, currency);
      setAlert({ msg: data.message, type: "success" });
      refresh();
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Could not save settings.", type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Brand Colors & Currency</h2>
      <p style={{ marginBottom: 20 }}>Match the widget to your store's look.</p>
      <div className="form-group">
        <label className="form-label">Brand Color</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 50, height: 40, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
          <input type="text" value={color} onChange={(e) => setColor(e.target.value)} style={{ flex: 1 }} placeholder="#4f46e5" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Currency</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="PKR">PKR – Pakistani Rupee</option>
          <option value="USD">USD – US Dollar</option>
          <option value="AED">AED – UAE Dirham</option>
        </select>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={busy}>
        Save Branding
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
    try {
      const data = await dashboardApi.whatsapp.save(token, number.trim());
      setAlert({ msg: data.message || data.error || "", type: data.success ? "success" : "error" });
      refresh();
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Connection error.", type: "error" });
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
        <label className="form-label">WhatsApp Number</label>
        <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="03001234567" />
      </div>
      <button className="btn btn-primary" onClick={saveNumber} disabled={savingNumber}>
        Save WhatsApp Number
      </button>

      {store?.whatsappVerified && <div style={{ marginTop: 12, fontSize: 13, fontWeight: 500, color: "var(--success)" }}>Saved</div>}
      <Alert msg={alert?.msg ?? null} type={alert?.type ?? null} />
    </div>
  );
}

function PreviewCard() {
  const { store } = useStoreAuth();
  const color = store?.brandColor || "#4f46e5";
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
        <div style={{ position: "absolute", bottom: 82, right: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
          <span style={{ fontWeight: 700, color: "var(--text)" }}>BuildVolt</span>
          <br />
          PC Build Recommender
        </div>
      </div>
    </div>
  );
}

function WidgetTextCard() {
  const { token, refresh } = useStoreAuth();
  const toast = useToast();
  const [title, setTitle] = useState("BuildVolt");
  const [welcome, setWelcome] = useState("");
  const [buttonText, setButtonText] = useState("Get Started");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    dashboardApi.me(token).then((data) => {
      const s = data.store as unknown as Record<string, unknown>;
      setTitle((s.widget_title as string) || "BuildVolt");
      setWelcome((s.welcome_msg as string) || "");
      setButtonText((s.button_text as string) || "Get Started");
    });
  }, [token]);

  async function save() {
    if (!token) return;
    setBusy(true);
    try {
      const data = await dashboardApi.settings.saveWidgetText(token, title, welcome, buttonText);
      if (data.success) {
        toast.success("Saved", data.message);
        refresh();
      } else {
        toast.error("Error", data.error || "");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not save widget text.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Widget Text &amp; Content</h2>
      <p style={{ marginBottom: 24 }}>Customize what your customers see inside the widget.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div className="form-group">
            <label className="form-label">Widget Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={30} />
          </div>
          <div className="form-group">
            <label className="form-label">Button Text</label>
            <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} maxLength={20} />
          </div>
        </div>
        <div>
          <div className="form-group">
            <label className="form-label">Welcome Message</label>
            <textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} maxLength={200} rows={4} />
          </div>
        </div>
      </div>
      <button className="btn btn-primary" onClick={save} disabled={busy}>
        Save Widget Text
      </button>
    </div>
  );
}

function WidgetToggleCard({ enabled, onChanged }: { enabled: boolean; onChanged: () => void }) {
  const { token } = useStoreAuth();
  const toast = useToast();
  const [checked, setChecked] = useState(enabled);
  const [busy, setBusy] = useState(false);

  useEffect(() => setChecked(enabled), [enabled]);

  async function toggle(next: boolean) {
    if (!token) return;
    setBusy(true);
    try {
      const data = await dashboardApi.settings.toggleWidget(token, next);
      if (data.success) {
        setChecked(next);
        toast.success("Saved", data.message);
        onChanged();
      } else {
        toast.error("Could not enable widget", data.error || "");
      }
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not update widget status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h2>Widget Status</h2>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", marginTop: 10 }}>
        <input type="checkbox" checked={checked} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
        Widget enabled
      </label>
    </div>
  );
}
