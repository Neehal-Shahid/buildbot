import { useState } from "react";
import { dashboardApi } from "../../lib/dashboardApi";
import { useStoreAuth } from "../../context/StoreAuthContext";
import { isLikelyValidPakistaniMobile } from "../../lib/phone";
import { ApiError } from "../../lib/api";

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "#fff",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  color: "#111827",
  fontSize: 14,
  outline: "none",
} as const;

export default function OnboardingStep2() {
  const { token, store, refresh } = useStoreAuth();
  const [number, setNumber] = useState(store?.whatsappNumber || "");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; color: string } | null>(null);

  async function save() {
    if (!number.trim()) return setAlert({ msg: "Please enter your WhatsApp number.", color: "#ef4444" });
    if (!isLikelyValidPakistaniMobile(number)) {
      return setAlert({
        msg: "That doesn't look like a valid Pakistani mobile number. Use 03XXXXXXXXX or +923XXXXXXXXX.",
        color: "#ef4444",
      });
    }
    if (!token) return;
    setSaving(true);
    setAlert(null);
    try {
      const data = await dashboardApi.whatsapp.save(token, number.trim());
      if (data.success) {
        setAlert({ msg: "Saved! Taking you to your dashboard…", color: "#16a34a" });
        setTimeout(refresh, 600);
      } else {
        setAlert({ msg: data.error || "Could not save number.", color: "#ef4444" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Connection error.", color: "#ef4444" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="page"
      style={{ display: "flex", minHeight: "calc(100vh - 52px)", alignItems: "center", justifyContent: "center", background: "#f7f8fa", padding: "24px 20px" }}
    >
      <div style={{ background: "#ffffff", border: "1px solid #e4e7ed", borderRadius: 18, padding: 40, width: "100%", maxWidth: 420, textAlign: "left", boxShadow: "0 4px 12px rgba(17,24,39,0.05)" }}>
        <h2 style={{ fontSize: 22, color: "#111827", marginBottom: 6, fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 700 }}>
          Add your order number
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 24 }}>
          Customers need a real way to place their order. Add a WhatsApp number now — you can connect WooCommerce
          for automatic cart checkout later from Settings.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
            WhatsApp Number <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="03001234567"
            style={inputStyle}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          style={{ width: "100%", padding: 12, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          {saving ? "Saving…" : "Save & Finish Setup"}
        </button>

        {alert && (
          <div style={{ marginTop: 16, fontSize: 13, textAlign: "center", color: alert.color }}>{alert.msg}</div>
        )}
      </div>
    </div>
  );
}
