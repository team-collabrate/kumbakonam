import type { PrinterStatus } from "../hooks/usePrinter";
import "./PrinterSetupModal.css";

export interface PrinterSetupModalProps {
  status: PrinterStatus;
  error: string | null;
  deviceName: string | null;
  onConnect: () => void;
  onClose: () => void;
}

const STATUS_TEXT: Record<PrinterStatus, string> = {
  unsupported: "This browser doesn't support Web USB. Use Chrome on Android to print.",
  checking: "Checking for a previously connected printer…",
  unpaired: "No printer connected yet.",
  connecting: "Waiting for you to pick a device…",
  ready: "Printer connected.",
  error: "Printer isn't responding.",
};

/** Engineering Plan Phase 3 — one-time "connect printer" setup screen. */
export function PrinterSetupModal({ status, error, deviceName, onConnect, onClose }: PrinterSetupModalProps) {
  return (
    <div className="printer-modal__backdrop" role="dialog" aria-modal="true" aria-label="Printer setup">
      <div className="printer-modal">
        <h2 className="printer-modal__title">Printer Setup</h2>

        <p className="printer-modal__status">
          {status === "ready" && deviceName ? `Connected: ${deviceName}` : STATUS_TEXT[status]}
        </p>

        {error && <p className="printer-modal__error">{error}</p>}

        <button
          type="button"
          className="printer-modal__connect"
          onClick={onConnect}
          disabled={status === "unsupported" || status === "connecting"}
        >
          {status === "ready" ? "Connect a different printer" : "Connect Printer"}
        </button>

        <button type="button" className="printer-modal__close" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
