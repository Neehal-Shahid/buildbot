import type { AdminStore } from "../lib/adminApi";

export function StatusBadge({ store }: { store: AdminStore }) {
  const es = store.effectiveStatus || store.plan_status || "unknown";
  if (es === "active") {
    return (
      <span className="badge badge-success">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: -2 }}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Active
      </span>
    );
  }
  if (es === "disabled") {
    return <span className="badge badge-muted">Disabled</span>;
  }
  return <span className="badge badge-muted">{es}</span>;
}
