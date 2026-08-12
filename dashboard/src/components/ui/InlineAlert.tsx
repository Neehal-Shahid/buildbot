export type AlertType = "success" | "error" | "info" | "warning";

// Replaces the ~11 duplicated per-form `<div class="alert" id="...">` +
// showAlert(id, msg, type) pattern from the original app with one
// component driven by state instead of DOM id lookups.
export function InlineAlert({
  type,
  message,
}: {
  type: AlertType;
  message: string | null;
}) {
  if (!message) return null;

  // Fixed Tailwind palette colors rather than the design-token classes
  // (bg-success-bg/text-success/etc.) — see Button.tsx for why: those
  // resolve through CSS variables that differ per page, and a shared
  // component needs to look right regardless of which page renders it.
  const classes: Record<AlertType, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-600",
    error: "bg-red-50 text-red-700 border-red-600",
    info: "bg-sky-50 text-sky-700 border-sky-600",
    warning: "bg-amber-50 text-amber-700 border-amber-600",
  };

  return (
    <div
      role="alert"
      className={`rounded-md border px-3 py-2 text-sm ${classes[type]}`}
    >
      {message}
    </div>
  );
}
