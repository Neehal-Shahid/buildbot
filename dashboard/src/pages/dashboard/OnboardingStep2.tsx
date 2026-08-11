import { useState } from "react";
import { dashboardApi } from "../../lib/dashboardApi";
import { useStoreAuth } from "../../context/StoreAuthContext";
import { openWhatsAppSmart } from "../../lib/whatsapp";
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
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [alert, setAlert] = useState<{ msg: string; color: string } | null>(null);

  async function sendCode() {
    if (!number.trim()) return setAlert({ msg: "Please enter your WhatsApp number.", color: "#ef4444" });
    if (!token) return;
    setSending(true);
    setAlert(null);
    try {
      const saveData = await dashboardApi.whatsapp.save(token, number.trim());
      if (!saveData.success) {
        setAlert({ msg: saveData.error || "Could not save number.", color: "#ef4444" });
        return;
      }
      const codeData = await dashboardApi.whatsapp.sendCode(token);
      if (codeData.success) {
        openWhatsAppSmart(codeData.waLink);
        setCodeSent(true);
        setAlert({ msg: "We opened WhatsApp with the code — send it, then type the code below.", color: "#16a34a" });
      } else {
        setAlert({ msg: codeData.error || "Could not send code.", color: "#ef4444" });
      }
    } catch (err) {
      setAlert({ msg: err instanceof ApiError ? err.message : "Connection error.", color: "#ef4444" });
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (!code.trim()) return setAlert({ msg: "Enter the code.", color: "#ef4444" });
    if (!token) return;
    setVerifying(true);
    setAlert(null);
    try {
      const data = await dashboardApi.whatsapp.verify(token, code.trim());
      if (data.success) {
        setAlert({ msg: "Verified! Taking you to your dashboard…", color: "#16a34a" });
        setTimeout(refresh, 800);
      } else {
        setAlert({ msg: data.error || "Incorrect code.", color: "#ef4444" });
      }
    } catch {
      setAlert({ msg: "Connection error.", color: "#ef4444" });
    } finally {
      setVerifying(false);
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
          Customers need a real way to place their order. Verify a WhatsApp number now — you can connect WooCommerce
          for automatic cart checkout later from Settings.
        </p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
            WhatsApp Number <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="+923001234567" style={inputStyle} />
        </div>

        <button
          onClick={sendCode}
          disabled={sending}
          style={{ width: "100%", padding: 12, background: "#fff", color: "#4f46e5", border: "1.5px solid #4f46e5", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}
        >
          {codeSent ? "Resend Code" : "Send Verification Code"}
        </button>

        {codeSent && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                We opened WhatsApp with a code pre-filled — send that message, then type the code here
              </label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6} style={inputStyle} />
            </div>
            <button
              onClick={verify}
              disabled={verifying}
              style={{ width: "100%", padding: 12, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
            >
              Verify & Finish Setup
            </button>
          </div>
        )}

        {alert && (
          <div style={{ marginTop: 16, fontSize: 13, textAlign: "center", color: alert.color }}>{alert.msg}</div>
        )}
      </div>
    </div>
  );
}
