import { Navigate } from "react-router-dom";
import { StoreAuthProvider, useStoreAuth } from "../context/StoreAuthContext";
import OnboardingStep1 from "./dashboard/OnboardingStep1";
import OnboardingStep2 from "./dashboard/OnboardingStep2";
import DashboardApp from "./dashboard/DashboardApp";
import { Spinner } from "../components/ui/Spinner";

function Gate() {
  const { token, store, loading } = useStoreAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-muted">
        <Spinner size={24} />
      </div>
    );
  }

  if (!token || !store) return <Navigate to="/" replace />;

  if (store.storeId.startsWith("temp-")) return <OnboardingStep1 />;

  if (!store.wooConnected && !store.whatsappVerified) return <OnboardingStep2 />;

  return <DashboardApp />;
}

export default function DashboardPage() {
  return (
    <StoreAuthProvider>
      <Gate />
    </StoreAuthProvider>
  );
}
