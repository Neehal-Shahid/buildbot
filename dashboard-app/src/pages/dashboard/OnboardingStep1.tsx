import { useState } from "react";
import { dashboardApi } from "../../lib/dashboardApi";
import { useStoreAuth } from "../../context/StoreAuthContext";
import { ApiError } from "../../lib/api";

export default function OnboardingStep1() {
  const { token, store, setSession, refresh } = useStoreAuth();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) return setError("Please enter a store name.");
    if (!token || !store) return;
    setBusy(true);
    setError(null);
    try {
      const data = await dashboardApi.storeSetup(token, name.trim());
      if (data.success) {
        setSession(data.token, { ...store, storeId: data.storeId, name: data.name });
        await refresh();
      } else {
        setError(data.error || "Failed to complete setup.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connection error.");
    } finally {
      setBusy(false);
    }
  }

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

  return (
    <div
      className="page"
      style={{ display: "flex", minHeight: "calc(100vh - 52px)", alignItems: "center", justifyContent: "center", background: "#f7f8fa", padding: "24px 20px" }}
    >
      <div style={{ background: "#ffffff", border: "1px solid #e4e7ed", borderRadius: 18, padding: 40, width: "100%", maxWidth: 420, textAlign: "left", boxShadow: "0 4px 12px rgba(17,24,39,0.05)" }}>
        <h2 style={{ fontSize: 22, color: "#111827", marginBottom: 6, fontFamily: '"DM Sans", system-ui, sans-serif', fontWeight: 700 }}>
          Welcome to BuildVolt
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 28 }}>Let's get your store set up and ready for customers.</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
            Store Name <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. TechZone Lahore"
            style={inputStyle}
          />
        </div>

        <button
          onClick={submit}
          disabled={busy}
          style={{ width: "100%", padding: 12, background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
        >
          {busy ? "Saving…" : "Continue"}
        </button>
        {error && (
          <div style={{ marginTop: 16, fontSize: 13, textAlign: "center", color: "#dc2626" }}>{error}</div>
        )}
      </div>
    </div>
  );
}
