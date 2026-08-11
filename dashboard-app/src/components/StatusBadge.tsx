import type { AdminStore } from "../lib/adminApi";

export function StatusBadge({ store }: { store: AdminStore }) {
  const es = store.effectiveStatus || store.plan_status || "unknown";
  if (es === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Active
      </span>
    );
  }
  if (es === "disabled") {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
        Disabled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
      {es}
    </span>
  );
}
