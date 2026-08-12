import type { ReactNode } from "react";
import { useState } from "react";

export function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  icon,
  iconBg,
  iconColor,
  title,
  desc,
  detail,
  confirmLabel,
  busyLabel = "Working…",
  confirmClass,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
  detail: ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  confirmClass: string;
}) {
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`modal-bg${open ? " open" : ""}`}>
      <div className="modal">
        <div className="modal-icon" style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
        <h3>{title}</h3>
        <p>{desc}</p>
        <div className="modal-detail">{detail}</div>
        <div className="modal-btns">
          <button className={confirmClass} onClick={confirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
          {/* Cancel is locked while the action is in flight — closing the
              modal mid-request left the caller's success toast firing over
              an already-dismissed dialog. */}
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
