import { useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { BrandLogo } from "../../components/BrandLogo";
import OverviewTab from "./tabs/OverviewTab";
import StoresTab from "./tabs/StoresTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import SettingsTab from "./tabs/SettingsTab";
import DbHealthTab from "./tabs/DbHealthTab";
import CommsTab from "./tabs/CommsTab";
import ActivityTab from "./tabs/ActivityTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "stores", label: "Stores" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
  { id: "dbhealth", label: "DB Health" },
  { id: "comms", label: "Communications" },
  { id: "activity", label: "Activity Log" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminApp() {
  const [tab, setTab] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAdminAuth();

  return (
    <div className="min-h-screen bg-bg">
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
          <span className="rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-semibold text-accent">
            Admin
          </span>
        </div>
        <button
          onClick={logout}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-text-2 hover:bg-surface-2"
        >
          Sign out
        </button>
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
                    tab === t.id
                      ? "bg-accent-light text-accent"
                      : "text-text-2 hover:bg-surface-2"
                  }`}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 p-5">
          {tab === "overview" && <OverviewTab />}
          {tab === "stores" && <StoresTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "settings" && <SettingsTab />}
          {tab === "dbhealth" && <DbHealthTab />}
          {tab === "comms" && <CommsTab />}
          {tab === "activity" && <ActivityTab />}
        </main>
      </div>
    </div>
  );
}
