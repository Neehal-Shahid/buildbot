import { useState } from "react";
import { useStoreAuth } from "../../context/StoreAuthContext";
import { BrandLogo } from "../../components/BrandLogo";
import HomeTab from "./tabs/HomeTab";
import StoreSyncTab from "./tabs/StoreSyncTab";
import ProductsTab from "./tabs/ProductsTab";
import OrdersTab from "./tabs/OrdersTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import WidgetSettingsTab from "./tabs/WidgetSettingsTab";
import EmbedTab from "./tabs/EmbedTab";
import AccountTab from "./tabs/AccountTab";
import HelpTab from "./tabs/HelpTab";

const TABS = [
  { id: "home", label: "Overview" },
  { id: "store", label: "Store & Sync" },
  { id: "products", label: "Products" },
  { id: "orders", label: "Orders" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Widget Settings" },
  { id: "embed", label: "Install Widget" },
  { id: "account", label: "Account" },
  { id: "help", label: "Contact Support" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DashboardApp() {
  const { store, logout } = useStoreAuth();
  const [tab, setTab] = useState<TabId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      {store?.planStatus === "disabled" && (
        <div className="bg-danger-bg px-4 py-2 text-center text-sm text-danger">
          Your account is currently disabled. Contact support for help.
        </div>
      )}

      <header className="flex items-center justify-between border-b border-border bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            className="text-text-2 md:hidden"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <BrandLogo />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-text-2 sm:inline">{store?.email}</span>
          <button
            onClick={logout}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-text-2 hover:bg-surface-2"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="flex">
        <nav
          className={`${sidebarOpen ? "block" : "hidden"} w-full border-r border-border bg-surface md:block md:w-56 md:shrink-0`}
        >
          <ul className="flex flex-col gap-1 p-3">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => {
                    setTab(t.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    tab === t.id ? "bg-accent-light text-accent" : "text-text-2 hover:bg-surface-2"
                  }`}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 p-5">
          {tab === "home" && <HomeTab onNavigate={setTab} />}
          {tab === "store" && <StoreSyncTab />}
          {tab === "products" && <ProductsTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "settings" && <WidgetSettingsTab />}
          {tab === "embed" && <EmbedTab />}
          {tab === "account" && <AccountTab />}
          {tab === "help" && <HelpTab />}
        </main>
      </div>
    </div>
  );
}
