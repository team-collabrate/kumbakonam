import { useLanguage } from "../../i18n";
import "./ConfirmDialog.css";

export interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as a destructive action (e.g. delete). */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DEFAULT_CONFIRM = { en: "Confirm", ta: "உறுதிசெய்" };
const DEFAULT_CANCEL = { en: "Cancel", ta: "ரத்துசெய்" };

/** Design Brief §8 — "Confirm dialogs for: clearing cart, deleting menu item, logout." */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { language } = useLanguage();
  const resolvedConfirmLabel = confirmLabel ?? DEFAULT_CONFIRM[language];
  const resolvedCancelLabel = cancelLabel ?? DEFAULT_CANCEL[language];
  return (
    <div className="confirm-dialog__backdrop" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="confirm-dialog">
        <h2 className="confirm-dialog__title">{title}</h2>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button type="button" className="confirm-dialog__cancel" onClick={onCancel}>
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog__confirm ${destructive ? "is-destructive" : ""}`}
            onClick={onConfirm}
          >
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
