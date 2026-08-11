import { useState } from "react";
import { useStoreAuth } from "../../context/StoreAuthContext";
import { TopNav } from "./TopNav";
import HomeTab from "./tabs/HomeTab";
import StoreSyncTab from "./tabs/StoreSyncTab";
import ProductsTab from "./tabs/ProductsTab";
import OrdersTab from "./tabs/OrdersTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import WidgetSettingsTab from "./tabs/WidgetSettingsTab";
import EmbedTab from "./tabs/EmbedTab";
import AccountTab from "./tabs/AccountTab";
import HelpTab from "./tabs/HelpTab";

const WORKSPACE_TABS = [
  {
    id: "home",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "store",
    label: "Store & sync",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "products",
    label: "Products",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "embed",
    label: "Install Widget",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2" />
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
        <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
        <path d="M20.07 4.93a10 10 0 0 1 0 14.14" />
        <path d="M3.93 19.07a10 10 0 0 1 0-14.14" />
      </svg>
    ),
  },
] as const;

const ACCOUNT_TABS = [
  {
    id: "settings",
    label: "Widget Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    id: "account",
    label: "Account",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: "help",
    label: "Contact Support",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
] as const;

type TabId = (typeof WORKSPACE_TABS)[number]["id"] | (typeof ACCOUNT_TABS)[number]["id"];

export default function DashboardApp() {
  const { store, logout } = useStoreAuth();
  const [tab, setTab] = useState<TabId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initials = ((store?.email || "").trim().charAt(0) || "U").toUpperCase();

  return (
    <div className="page" id="page-app">
      <TopNav onMenuClick={() => setSidebarOpen(true)} />
      <div className={`sidebar-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />
      <div className="app-layout">
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="sidebar-header">
            <div className="sidebar-logo-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="sidebar-logo-name">BuildVolt</span>
            <button type="button" className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <nav className="sidebar-nav">
            <span className="sidebar-section-label">Workspace</span>
            {WORKSPACE_TABS.map((t) => (
              <div
                key={t.id}
                className={`sidebar-item${tab === t.id ? " active" : ""}`}
                onClick={() => {
                  setTab(t.id);
                  setSidebarOpen(false);
                }}
              >
                {t.icon}
                {t.label}
              </div>
            ))}

            <div className="sidebar-divider" />
            <span className="sidebar-section-label">Your account</span>
            {ACCOUNT_TABS.map((t) => (
              <div
                key={t.id}
                className={`sidebar-item${tab === t.id ? " active" : ""}`}
                onClick={() => {
                  setTab(t.id);
                  setSidebarOpen(false);
                }}
              >
                {t.icon}
                {t.label}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials}</div>
              <span className="sidebar-user-email">{store?.email}</span>
            </div>
            <div className="sidebar-item" onClick={logout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Logout
            </div>
          </div>
        </aside>

        <div className="main">
          {store?.planStatus === "disabled" && (
            <div style={{ marginBottom: 16, padding: "14px 16px", background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: "var(--r-md)", color: "var(--text)", fontSize: 13, lineHeight: 1.5 }}>
              <strong>Your account has been disabled.</strong> Your widget is no longer showing recommendations to
              customers. Contact support if you believe this is a mistake.
            </div>
          )}

          {tab === "home" && <HomeTab onNavigate={setTab} />}
          {tab === "store" && <StoreSyncTab />}
          {tab === "products" && <ProductsTab />}
          {tab === "orders" && <OrdersTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "settings" && <WidgetSettingsTab />}
          {tab === "embed" && <EmbedTab />}
          {tab === "account" && <AccountTab />}
          {tab === "help" && <HelpTab />}
        </div>
      </div>
    </div>
  );
}
