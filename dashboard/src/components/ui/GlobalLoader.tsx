import { useSyncExternalStore } from "react";
import { loaderSnapshot, loaderSubscribe } from "../../lib/loader";

// A slim top-of-viewport progress bar instead of a floating badge — this
// component is mounted globally and has no page context, but "bg-surface"
// (and every other design-token color) is a CSS variable that each page
// redeclares differently on :root (landing.css sets --surface to a dark
// navy for its dark theme). A badge relying on that variable would go dark
// on light pages and vice versa. A fixed-color line at the very edge of
// the screen sidesteps that entirely and reads as a standard, unobtrusive
// loading indicator (GitHub/YouTube-style) on any page.
export function GlobalLoader() {
  const loading = useSyncExternalStore(loaderSubscribe, loaderSnapshot);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 999999,
        pointerEvents: "none",
        overflow: "hidden",
        opacity: loading ? 1 : 0,
        transition: "opacity 0.2s ease",
      }}
    >
      <div className="global-loader-sweep" />
    </div>
  );
}
