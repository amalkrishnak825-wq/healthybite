import { AlertCircle, X } from "lucide-react";

export default function ActionConfirmation({
  open,
  title,
  message,
  confirmLabel,
  busy = false,
  variant = "default",
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div
      className="action-confirm-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        className="action-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-confirm-title"
      >
        <button
          type="button"
          className="action-confirm-close"
          onClick={onCancel}
          disabled={busy}
          aria-label="Close confirmation"
        >
          <X size={19} />
        </button>
        <span className={`action-confirm-icon ${variant}`}>
          <AlertCircle size={22} />
        </span>
        <h2 id="action-confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="action-confirm-buttons">
          <button
            type="button"
            className="action-confirm-cancel"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`action-confirm-accept ${variant}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
