import { useState } from "react";
import { dashboardApi } from "../../lib/dashboardApi";
import { useStoreAuth } from "../../context/StoreAuthContext";
import { ApiError } from "../../lib/api";
import { BrandLogo } from "../../components/BrandLogo";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";

export default function OnboardingStep1() {
  const { token, store, setSession, refresh } = useStoreAuth();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Please enter a store name.");
      return;
    }
    if (!token || !store) return;
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.storeSetup(token, name.trim());
      if (data.success) {
        // storeId changes here, so the old token (still carrying the
        // temp- id) would 404 on the very next request — must switch to
        // the freshly issued token before moving to step 2.
        setSession(data.token, { ...store, storeId: data.storeId, name: data.name });
        await refresh();
      } else {
        setError(data.error || "Failed to complete setup.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connection error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <div className="w-full max-w-[440px] rounded-2xl border border-border bg-surface p-9 shadow-sm">
        <div className="mb-6">
          <BrandLogo />
        </div>
        <h2 className="mb-1 text-xl font-bold tracking-tight text-text">
          Set up your store
        </h2>
        <p className="mb-6 text-[13px] leading-relaxed text-muted">
          What should we call your store? You can change this later.
        </p>

        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-2">
            Store name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="e.g. Rare Carpets Computers"
            className="w-full rounded-[9px] border border-border bg-bg px-3 py-2.5 text-[13.5px] text-text outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_rgba(79,70,229,0.1)]"
          />
        </div>

        <Button onClick={submit} loading={loading} className="w-full">
          Complete Setup
        </Button>
        {error && (
          <div className="mt-3.5">
            <InlineAlert type="error" message={error} />
          </div>
        )}
      </div>
    </div>
  );
}
