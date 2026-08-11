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

  const classes: Record<AlertType, string> = {
    success: "bg-success-bg text-success border-success",
    error: "bg-danger-bg text-danger border-danger",
    info: "bg-info-bg text-info border-info",
    warning: "bg-warning-bg text-warning border-warning",
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
