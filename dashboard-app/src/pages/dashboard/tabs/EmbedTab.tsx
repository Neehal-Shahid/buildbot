import { useState } from "react";
import { useStoreAuth } from "../../../context/StoreAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { getWidgetScriptUrl } from "../../../lib/config";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";

export default function EmbedTab() {
  const { store } = useStoreAuth();
  const toast = useToast();
  const [live, setLive] = useState(localStorage.getItem("bb_widget_live") === "1");
  const snippet = store ? getWidgetScriptUrl(store.storeId) : "";

  function copy() {
    navigator.clipboard.writeText(snippet);
    localStorage.setItem("bb_embed_copied", "1");
    toast.success("Copied", "Embed code copied to clipboard.");
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Install the widget">
        <ol className="mb-4 list-decimal pl-5 text-sm text-text-2">
          <li>Copy the script tag below.</li>
          <li>Paste it into your site's HTML, right before the closing <code>&lt;/body&gt;</code> tag.</li>
          <li>Once it's live on your site, mark it as live below.</li>
        </ol>
        <pre className="overflow-x-auto rounded-md border border-border bg-bg p-3 text-xs text-text">
          {snippet}
        </pre>
        <Button onClick={copy} className="mt-3">
          Copy embed code
        </Button>
      </Card>

      <Card title="Widget live status">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${live ? "bg-success" : "bg-dim"}`}
          />
          <span className="text-sm text-text-2">{live ? "Marked as live" : "Not marked as live yet"}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              localStorage.setItem("bb_widget_live", "1");
              setLive(true);
            }}
          >
            Mark as live
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem("bb_widget_live");
              setLive(false);
            }}
          >
            Reset
          </Button>
        </div>
      </Card>
    </div>
  );
}
