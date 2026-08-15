import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useStoreAuth } from "../../context/StoreAuthContext";
import { dashboardApi } from "../../lib/dashboardApi";
import { hasChosenMode, isSourceMismatched } from "../../lib/storeMode";
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

// Store & Sync, Products, and Install Widget are one sequence — setting up
// a widget genuinely isn't done until all three are — so each carries a
// `step` number the sidebar renders as a numbered badge instead of (or
// alongside) its icon, in that order, ahead of Orders/Analytics.
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
    step: 1,
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
    step: 2,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: "embed",
    label: "Install Widget",
    step: 3,
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

// .sidebar-item is a <div> to preserve the ported stylesheet's layout
// (a <button> would drag in UA border/background/width defaults that
// dashboard.css never overrides). Give it the keyboard behaviour a real
// button would have instead, so the nav isn't mouse-only.
function activate(e: KeyboardEvent<HTMLDivElement>, fn: () => void) {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fn();
  }
}

function lastSeenOrderKey(storeId: string) {
  return `bb_last_seen_order_${storeId}`;
}

export default function DashboardApp() {
  const { store, token, logout } = useStoreAuth();
  const [tab, setTab] = useState<TabId>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [unseenOrders, setUnseenOrders] = useState(0);
  const [latestOrderId, setLatestOrderId] = useState<string | number | null>(null);
  // Website type (Step 1) lives in localStorage, not React state (see
  // lib/storeMode.ts), so changing it doesn't naturally trigger a
  // re-render here — without this, switching it from EmbedTab's "Wrong
  // choice? Switch to..." link (which, unlike StoreSyncTab's own confirm
  // flow, doesn't navigate anywhere afterward) left the sidebar's
  // Products/Install Widget checkmarks showing the PRE-switch
  // done/mismatched state until some unrelated re-render happened to
  // come along. Passed down as onModeChange; bumping it forces this
  // component to re-render and recompute sourceMismatch below against
  // the now-current localStorage value.
  const [, bumpModeVersion] = useState(0);
  const onModeChange = () => bumpModeVersion((v) => v + 1);

  const initials = ((store?.email || "").trim().charAt(0) || "U").toUpperCase();

  // dashboard.css defines `body.sidebar-open { overflow: hidden }` for the
  // mobile drawer but nothing was ever applying the class, so the page
  // behind the open drawer still scrolled under your finger.
  useEffect(() => {
    document.body.classList.toggle("sidebar-open", sidebarOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  // Escape closes the drawer, matching every other dismissible overlay.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // Powers the Step 2 (Products) completion badge — a lightweight count,
  // not the full catalog. Refreshed on mount, whenever the store's active
  // data source changes (switching source, or confirming one for the
  // first time, can move the count from 0 to non-zero or back without any
  // tab navigation happening at all — see confirmDataSource in
  // ProductsTab.tsx, which calls refresh() but has no way to reach into
  // this component's own state), and on arriving at OR leaving the
  // Products tab (see goTo below) so both "I just fixed this, does the
  // sidebar agree" and "I changed something here, does the NEXT tab I
  // open know" are covered.
  function loadProductCount() {
    if (!token) return;
    dashboardApi
      .analytics(token, 0)
      .then((data) => setProductCount(data.productCount?.count ?? 0))
      .catch(() => {});
  }
  useEffect(loadProductCount, [token, store?.dataSource]);

  // New-order notification: compares the newest order's id against what
  // was last seen (per store, in localStorage) to compute an unread count
  // for the Orders sidebar badge. Polls every 60s so a badge can appear
  // without needing a manual refresh; opening the Orders tab marks
  // everything caught up.
  function checkOrders() {
    if (!token || !store) return;
    dashboardApi
      .orderRequests(token)
      .then((data) => {
        const orders = data.orders || [];
        setLatestOrderId(orders[0]?.id ?? null);
        const lastSeen = localStorage.getItem(lastSeenOrderKey(store.storeId));
        if (!lastSeen) {
          // First time this store has ever been viewed on this device —
          // nothing is "new", there's just no history yet.
          setUnseenOrders(0);
          return;
        }
        const idx = orders.findIndex((o) => String(o.id) === lastSeen);
        // Not found means the last-seen order aged out of the 100-row
        // window — treat everything currently loaded as unseen rather
        // than guessing.
        setUnseenOrders(idx === -1 ? orders.length : idx);
      })
      .catch(() => {});
  }
  useEffect(() => {
    checkOrders();
    const interval = setInterval(checkOrders, 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, store?.storeId]);

  function goTo(id: TabId) {
    // Whichever of arriving at OR leaving Products (Step 2) is what just
    // happened, the count may have changed — added/removed a product,
    // switched data source while already there (that path is also
    // covered reactively above, but this catches everything else too,
    // e.g. a plugin background sync that landed while the store owner
    // was sitting on this tab).
    if (id === "products" || tab === "products") loadProductCount();
    setTab(id);
    setSidebarOpen(false);
    if (id === "orders" && store && latestOrderId !== null) {
      localStorage.setItem(lastSeenOrderKey(store.storeId), String(latestOrderId));
      setUnseenOrders(0);
    }
  }

  const hasOrderMethod = !!(store?.wooConnected || store?.whatsappVerified);
  // A confirmed data source that no longer fits the website type (e.g.
  // switched from WordPress to Custom after WooCommerce was already
  // chosen — see Products tab's own picker) means the widget can't
  // actually be trusted to serve real products anymore, even if it once
  // did. Both Products and Install Widget must stop reading as "done"
  // until the store owner re-picks a source, or the sidebar would keep
  // claiming everything's ready while the live widget shows customers
  // "no products yet".
  const sourceMismatch = isSourceMismatched(
    store?.storeId || "",
    store?.dataSource ?? "manual",
    !!store?.dataSourceConfirmed,
  );
  const stepDone: Record<number, boolean> = {
    1: hasChosenMode(store?.storeId),
    2: (productCount ?? 0) > 0 && !sourceMismatch,
    // Both halves matter: widgetLastSeen is real evidence the snippet is
    // pasted and loading (not just "you could technically go live" — see
    // storeDB.touchWidgetSeen), and hasOrderMethod/widgetEnabled confirm
    // it's still actually able to take orders right now, in case it was
    // installed once and then turned off again.
    3: !!store?.widgetLastSeen && hasOrderMethod && store?.widgetEnabled !== false && !sourceMismatch,
  };

  function renderTab(t: (typeof WORKSPACE_TABS)[number] | (typeof ACCOUNT_TABS)[number]) {
    const step = "step" in t ? t.step : undefined;
    const done = step ? stepDone[step] : undefined;
    const go = () => goTo(t.id);
    return (
      <div
        key={t.id}
        role="button"
        tabIndex={0}
        aria-current={tab === t.id ? "page" : undefined}
        className={`sidebar-item${tab === t.id ? " active" : ""}`}
        onClick={go}
        onKeyDown={(e) => activate(e, go)}
        style={{ position: "relative" }}
      >
        {step ? (
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              borderRadius: "50%",
              fontSize: 11,
              fontWeight: 700,
              flexShrink: 0,
              background: done ? "var(--success)" : "var(--border)",
              color: done ? "#fff" : "var(--muted)",
            }}
          >
            {done ? "✓" : step}
          </span>
        ) : (
          t.icon
        )}
        {t.label}
        {t.id === "orders" && unseenOrders > 0 && (
          <span
            aria-label={`${unseenOrders} new order${unseenOrders === 1 ? "" : "s"}`}
            style={{
              marginLeft: "auto",
              background: "var(--danger)",
              color: "#fff",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              padding: "1px 7px",
              minWidth: 18,
              textAlign: "center",
            }}
          >
            {unseenOrders > 99 ? "99+" : unseenOrders}
          </span>
        )}
      </div>
    );
  }

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
            {WORKSPACE_TABS.map(renderTab)}

            <div className="sidebar-divider" />
            <span className="sidebar-section-label">Your account</span>
            {ACCOUNT_TABS.map(renderTab)}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar">{initials}</div>
              <span className="sidebar-user-email">{store?.email}</span>
            </div>
            <div
              className="sidebar-item"
              role="button"
              tabIndex={0}
              onClick={logout}
              onKeyDown={(e) => activate(e, logout)}
            >
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
          {tab === "store" && <StoreSyncTab onNavigate={setTab} onModeChange={onModeChange} />}
          {tab === "products" && <ProductsTab onNavigate={setTab} />}
          {tab === "orders" && <OrdersTab />}
          {tab === "analytics" && <AnalyticsTab />}
          {tab === "settings" && <WidgetSettingsTab />}
          {tab === "embed" && <EmbedTab onModeChange={onModeChange} />}
          {tab === "account" && <AccountTab />}
          {tab === "help" && <HelpTab />}
        </div>
      </div>
    </div>
  );
}
