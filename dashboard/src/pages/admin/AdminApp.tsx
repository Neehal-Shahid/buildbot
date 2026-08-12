import { useEffect, useState } from "react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminApi } from "../../lib/adminApi";
import OverviewTab from "./tabs/OverviewTab";
import StoresTab from "./tabs/StoresTab";
import AnalyticsTab from "./tabs/AnalyticsTab";
import SettingsTab from "./tabs/SettingsTab";
import DbHealthTab from "./tabs/DbHealthTab";
import CommsTab from "./tabs/CommsTab";
import ActivityTab from "./tabs/ActivityTab";

const TABS = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
    section: "Platform",
  },
  {
    id: "stores",
    label: "All Stores",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    section: "Platform",
  },
  {
    id: "analytics",
    label: "Platform Stats",
    icon: (
      <svg viewBox="0 0 24 24">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
        <polyline points="17 6 23 6 23 12" />
      </svg>
    ),
    section: "Platform",
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    section: "Admin",
  },
  {
    id: "dbhealth",
    label: "DB Health",
    icon: (
      <svg viewBox="0 0 24 24">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    section: "Admin",
  },
  {
    id: "activity",
    label: "Activity Log",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    section: "Admin",
  },
  {
    id: "comms",
    label: "Communications",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
    section: "Admin",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminApp() {
  const [tab, setTab] = useState<TabId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { token, logout } = useAdminAuth();
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    if (!token) return;
    adminApi
      .me(token)
      .then((data) => setAdminName(data.admin.name))
      .catch(() => {
        // Decorative (nav-bar name) — a failed fetch just leaves it blank
        // rather than surfacing an error toast for something this minor.
      });
  }, [token]);

  return (
    <div id="admin-app">
      <nav>
        <div className="nav-left">
          <button type="button" className="nav-menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="nav-logo">
            <div className="nav-logo-mark">
              <svg viewBox="0 0 24 24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            BuildVolt Admin
          </div>
        </div>
        <div className="nav-right">
          {adminName && <span id="nav-admin-name">{adminName}</span>}
          {/* Styled by the `.nav-right a` element selector, so it stays an
              anchor — but it needs an explicit role/tabIndex to be
              reachable without a mouse, having no href. */}
          <a
            role="button"
            tabIndex={0}
            onClick={logout}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                logout();
              }
            }}
          >
            Sign out
          </a>
        </div>
      </nav>

      <div className={`sidebar-overlay${sidebarOpen ? " open" : ""}`} onClick={() => setSidebarOpen(false)} />

      <div className="layout">
        <div className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <button type="button" className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {(["Platform", "Admin"] as const).map((section) => (
            <div key={section}>
              <div className="sb-sep">{section}</div>
              {TABS.filter((t) => t.section === section).map((t) => {
                const select = () => {
                  setTab(t.id);
                  setSidebarOpen(false);
                };
                return (
                  <div
                    key={t.id}
                    className={`sb-item${tab === t.id ? " active" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-current={tab === t.id ? "page" : undefined}
                    onClick={select}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        select();
                      }
                    }}
                  >
                    {t.icon}
                    {t.label}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="main">
          {tab === "overview" && <OverviewTab />}
          {tab === "stores" && <StoresTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "settings" && <SettingsTab />}
          {tab === "dbhealth" && <DbHealthTab />}
          {tab === "activity" && <ActivityTab />}
          {tab === "comms" && <CommsTab />}
        </div>
      </div>
    </div>
  );
}
