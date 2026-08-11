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
            {confirmLabel}
          </button>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
