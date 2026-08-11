import { Navigate } from "react-router-dom";
import { StoreAuthProvider, useStoreAuth } from "../context/StoreAuthContext";
import { useInjectedCss } from "../lib/useInjectedCss";
import dashboardCss from "./dashboard/dashboard.css?raw";
import OnboardingStep1 from "./dashboard/OnboardingStep1";
import OnboardingStep2 from "./dashboard/OnboardingStep2";
import DashboardApp from "./dashboard/DashboardApp";
import { TopNav } from "./dashboard/TopNav";

function Gate() {
  const { token, store, loading } = useStoreAuth();

  if (loading) return null;

  if (!token || !store) return <Navigate to="/" replace />;

  if (store.storeId.startsWith("temp-")) {
    return (
      <>
        <TopNav />
        <OnboardingStep1 />
      </>
    );
  }

  if (!store.wooConnected && !store.whatsappVerified) {
    return (
      <>
        <TopNav />
        <OnboardingStep2 />
      </>
    );
  }

  return <DashboardApp />;
}

export default function DashboardPage() {
  useInjectedCss(dashboardCss);
  return (
    <StoreAuthProvider>
      <Gate />
    </StoreAuthProvider>
  );
}
