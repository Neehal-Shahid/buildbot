import { useEffect, useState } from "react";
import { dashboardApi } from "../../../lib/dashboardApi";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { openWhatsAppSmart } from "../../../lib/whatsapp";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { InlineAlert } from "../../../components/ui/InlineAlert";

export default function WidgetSettingsTab() {
  const { store, refresh } = useStoreAuth();

  return (
    <div className="flex flex-col gap-4">
      <BrandingCard />
      <WhatsappCard />
      <WidgetTextCard />
      <WidgetToggleCard enabled={store?.wooConnected || store?.whatsappVerified} onChanged={refresh} />
    </div>
  );
}

function BrandingCard() {
  const { token, store, refresh } = useStoreAuth();
  const toast = useToast();
  const [color, setColor] = useState(store?.brandColor || "#4f46e5");
  const [currency, setCurrency] = useState(store?.currency || "PKR");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!token) return;
    setSaving(true);
    try {
      const data = await dashboardApi.settings.saveBranding(token, color, currency);
      if (data.success) {
        toast.success("Saved", data.message);
        refresh();
      }
    } catch {
      toast.error("Error", "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Branding">
      <div className="mb-3 flex items-center gap-3">
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14" />
        <input
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div className="mb-3">
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        >
          <option value="PKR">PKR</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="INR">INR</option>
        </select>
      </div>
      <Button onClick={save} loading={saving}>
        Save branding
      </Button>
    </Card>
  );
}

function WhatsappCard() {
  const { token, store, refresh } = useStoreAuth();
  const [number, setNumber] = useState(store?.whatsappNumber || "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [savingNumber, setSavingNumber] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function saveNumber() {
    if (!token) return;
    setSavingNumber(true);
    setAlert(null);
    try {
      const data = await dashboardApi.whatsapp.save(token, number.trim());
      setAlert({ type: data.success ? "success" : "error", msg: data.message || data.error || "" });
      refresh();
    } catch {
      setAlert({ type: "error", msg: "Connection error." });
    } finally {
      setSavingNumber(false);
    }
  }

  async function sendCode() {
    if (!token) return;
    setSendingCode(true);
    setAlert(null);
    try {
      const data = await dashboardApi.whatsapp.sendCode(token);
      if (data.success) {
        openWhatsAppSmart(data.waLink);
        setCodeSent(true);
        setAlert({ type: "success", msg: "WhatsApp opened with the code — send it, then enter it below." });
      } else {
        setAlert({ type: "error", msg: data.error || "Could not send code." });
      }
    } catch {
      setAlert({ type: "error", msg: "Connection error." });
    } finally {
      setSendingCode(false);
    }
  }

  async function verify() {
    if (!token || !code.trim()) return;
    setVerifying(true);
    setAlert(null);
    try {
      const data = await dashboardApi.whatsapp.verify(token, code.trim());
      if (data.success) {
        setAlert({ type: "success", msg: "WhatsApp number verified!" });
        refresh();
      } else {
        setAlert({ type: "error", msg: data.error || "Incorrect code." });
      }
    } catch {
      setAlert({ type: "error", msg: "Connection error." });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card title="WhatsApp ordering number" subtitle="Used for the widget's 'Order via WhatsApp' fallback.">
      <div className="mb-3 flex items-center gap-2">
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="+923001234567"
          className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
        <Button onClick={saveNumber} loading={savingNumber}>
          Save
        </Button>
        {store?.whatsappVerified && (
          <span className="rounded-full bg-success-bg px-2 py-1 text-xs font-medium text-success">Verified</span>
        )}
      </div>

      {!store?.whatsappVerified && (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={sendCode} loading={sendingCode} className="w-fit">
            {codeSent ? "Resend code" : "Send verification code"}
          </Button>
          {codeSent && (
            <div className="flex items-center gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-32 rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
              />
              <Button onClick={verify} loading={verifying}>
                Verify
              </Button>
            </div>
          )}
        </div>
      )}

      {alert && (
        <div className="mt-3">
          <InlineAlert type={alert.type} message={alert.msg} />
        </div>
      )}
    </Card>
  );
}

function WidgetTextCard() {
  const { token, refresh } = useStoreAuth();
  const toast = useToast();
  const [title, setTitle] = useState("BuildVolt");
  const [welcome, setWelcome] = useState("");
  const [buttonText, setButtonText] = useState("Get Started");
  const [saving, setSaving] = useState(false);

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
    if (title.length > 30 || welcome.length > 200 || buttonText.length > 20) {
      toast.error("Too long", "Check the character limits on each field.");
      return;
    }
    setSaving(true);
    try {
      const data = await dashboardApi.settings.saveWidgetText(token, title, welcome, buttonText);
      if (data.success) {
        toast.success("Saved", data.message);
        refresh();
      } else {
        toast.error("Error", data.error || "");
      }
    } catch {
      toast.error("Error", "Could not save widget text.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Widget text">
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Title (max 30 chars)
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={30}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Welcome message (max 200 chars)
        </label>
        <textarea
          value={welcome}
          onChange={(e) => setWelcome(e.target.value)}
          maxLength={200}
          rows={3}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <div className="mb-3">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-2">
          Button text (max 20 chars)
        </label>
        <input
          value={buttonText}
          onChange={(e) => setButtonText(e.target.value)}
          maxLength={20}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text"
        />
      </div>
      <Button onClick={save} loading={saving}>
        Save widget text
      </Button>
    </Card>
  );
}

function WidgetToggleCard({ enabled, onChanged }: { enabled?: boolean; onChanged: () => void }) {
  const { token } = useStoreAuth();
  const toast = useToast();
  const [checked, setChecked] = useState(!!enabled);
  const [loading, setLoading] = useState(false);

  useEffect(() => setChecked(!!enabled), [enabled]);

  async function toggle(next: boolean) {
    if (!token) return;
    setLoading(true);
    try {
      const data = await dashboardApi.settings.toggleWidget(token, next);
      if (data.success) {
        setChecked(next);
        toast.success("Saved", data.message);
        onChanged();
      } else {
        toast.error("Could not enable widget", data.error || "");
      }
    } catch {
      toast.error("Error", "Could not update widget status.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Widget status">
      <label className="flex items-center gap-2 text-sm text-text-2">
        <input
          type="checkbox"
          checked={checked}
          disabled={loading}
          onChange={(e) => toggle(e.target.checked)}
        />
        Widget enabled
      </label>
    </Card>
  );
}
