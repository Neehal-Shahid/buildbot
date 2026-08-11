import { useState } from "react";
import { dashboardApi } from "../../lib/dashboardApi";
import { useStoreAuth } from "../../context/StoreAuthContext";
import { openWhatsAppSmart } from "../../lib/whatsapp";
import { ApiError } from "../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";

export default function OnboardingStep2() {
  const { token, store, refresh } = useStoreAuth();
  const [number, setNumber] = useState(store?.whatsappNumber || "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function sendCode() {
    if (!number.trim()) {
      setAlert({ type: "error", msg: "Please enter your WhatsApp number." });
      return;
    }
    if (!token) return;
    setSending(true);
    setAlert(null);
    try {
      // Save first (this also resets any prior verification), then
      // request a code for the number that's now actually on file.
      const saveData = await dashboardApi.whatsapp.save(token, number.trim());
      if (!saveData.success) {
        setAlert({ type: "error", msg: saveData.error || "Could not save number." });
        return;
      }
      const codeData = await dashboardApi.whatsapp.sendCode(token);
      if (codeData.success) {
        openWhatsAppSmart(codeData.waLink);
        setCodeSent(true);
        setAlert({
          type: "success",
          msg: "WhatsApp opened with the code — send it, then type the code below.",
        });
      } else {
        setAlert({ type: "error", msg: codeData.error || "Could not send code." });
      }
    } catch (err) {
      setAlert({ type: "error", msg: err instanceof ApiError ? err.message : "Connection error." });
    } finally {
      setSending(false);
    }
  }

  async function verify() {
    if (!code.trim()) {
      setAlert({ type: "error", msg: "Enter the code." });
      return;
    }
    if (!token) return;
    setVerifying(true);
    setAlert(null);
    try {
      const data = await dashboardApi.whatsapp.verify(token, code.trim());
      if (data.success) {
        setAlert({ type: "success", msg: "Verified! Taking you to your dashboard…" });
        setTimeout(refresh, 800);
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
    <div className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-9 shadow-sm">
        <div className="mb-6">
          <BrandLogo />
        </div>
        <h2 className="mb-1 text-xl font-bold tracking-tight text-text">
          Verify your WhatsApp number
        </h2>
        <p className="mb-6 text-[13px] leading-relaxed text-muted">
          Customers will message this number to place their order. It needs
          to be verified before your widget can go live.
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
            WhatsApp number
          </label>
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+923001234567"
            className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
          />
        </div>

        <Button onClick={sendCode} loading={sending} className="w-full">
          {codeSent ? "Resend Code" : "Send Verification Code"}
        </Button>

        {codeSent && (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
              Verification code
            </label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              placeholder="123456"
              className="mb-3 w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
            />
            <Button onClick={verify} loading={verifying} className="w-full">
              Verify & Finish Setup
            </Button>
          </div>
        )}

        {alert && (
          <div className="mt-3.5">
            <InlineAlert type={alert.type} message={alert.msg} />
          </div>
        )}
      </div>
    </div>
  );
}
