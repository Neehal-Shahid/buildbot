import { useStoreAuth } from "../../context/StoreAuthContext";

export function TopNav({ onMenuClick }: { onMenuClick?: () => void }) {
  const { store, logout } = useStoreAuth();
  return (
    <nav>
      <div className="nav-left">
        {onMenuClick && (
          <button type="button" className="nav-menu-btn" onClick={onMenuClick} aria-label="Open menu">
            <svg viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div className="nav-logo">BuildVolt</div>
      </div>
      <div className="nav-right">
        <span className="nav-user-email">{store?.email || ""}</span>
        <button type="button" className="btn btn-sm" onClick={logout}>
          Logout
        </button>
      </div>
    </nav>
  );
}
