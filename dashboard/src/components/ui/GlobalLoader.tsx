import { useSyncExternalStore } from "react";
import { loaderSnapshot, loaderSubscribe } from "../../lib/loader";
import { Spinner } from "./Spinner";

export function GlobalLoader() {
  const loading = useSyncExternalStore(loaderSubscribe, loaderSnapshot);

  return (
    <div
      className="fixed top-5 right-5 z-[999999] flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface shadow-md transition-opacity"
      style={{ opacity: loading ? 1 : 0, pointerEvents: "none" }}
    >
      <span className="text-accent">
        <Spinner size={20} />
      </span>
    </div>
  );
}
