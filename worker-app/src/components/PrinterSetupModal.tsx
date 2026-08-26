import { useEffect } from "react";
import { useLanguage, type Language } from "@kumbakonam/shared";
import type { PrinterStatus } from "../hooks/usePrinter";
import "./PrinterSetupModal.css";

export interface PrinterSetupModalProps {
  status: PrinterStatus;
  error: string | null;
  deviceName: string | null;
  onConnect: () => void;
  onClose: () => void;
}

const STATUS_TEXT: Record<PrinterStatus, Record<Language, string>> = {
  unsupported: {
    en: "This browser doesn't support Web USB. Use Chrome on Android to print.",
    ta: "இந்த உலாவி Web USB ஐ ஆதரிக்கவில்லை. அச்சிட Android இல் Chrome ஐப் பயன்படுத்தவும்.",
  },
  checking: {
    en: "Checking for a previously connected printer…",
    ta: "முன்பு இணைக்கப்பட்ட பிரிண்டரைச் சரிபார்க்கிறது…",
  },
  unpaired: { en: "No printer connected yet.", ta: "இன்னும் பிரிண்டர் இணைக்கப்படவில்லை." },
  connecting: { en: "Waiting for you to pick a device…", ta: "நீங்கள் ஒரு சாதனத்தைத் தேர்ந்தெடுக்க காத்திருக்கிறது…" },
  ready: { en: "Printer connected.", ta: "பிரிண்டர் இணைக்கப்பட்டது." },
  error: { en: "Printer isn't responding.", ta: "பிரிண்டர் பதிலளிக்கவில்லை." },
};

const STRINGS = {
  title: { en: "Printer Setup", ta: "பிரிண்டர் அமைப்பு" },
  connected: { en: "Connected", ta: "இணைக்கப்பட்டது" },
  connectAnother: { en: "Connect a different printer", ta: "வேறு பிரிண்டரை இணை" },
  connect: { en: "Connect Printer", ta: "பிரிண்டரை இணை" },
  done: { en: "Done", ta: "முடிந்தது" },
};

/** Engineering Plan Phase 3 — one-time "connect printer" setup screen. */
export function PrinterSetupModal({ status, error, deviceName, onConnect, onClose }: PrinterSetupModalProps) {
  const { language } = useLanguage();

  // Escape only — Enter is left alone so it can't accidentally trigger the
  // Web USB device picker (that's a real, deliberate action, not a default).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="printer-modal__backdrop" role="dialog" aria-modal="true" aria-label={STRINGS.title[language]}>
      <div className="printer-modal">
        <h2 className="printer-modal__title">{STRINGS.title[language]}</h2>

        <p className="printer-modal__status">
          {status === "ready" && deviceName ? `${STRINGS.connected[language]}: ${deviceName}` : STATUS_TEXT[status][language]}
        </p>

        {error && <p className="printer-modal__error">{error}</p>}

        <button
          type="button"
          className="printer-modal__connect"
          onClick={onConnect}
          disabled={status === "unsupported" || status === "connecting"}
        >
          {status === "ready" ? STRINGS.connectAnother[language] : STRINGS.connect[language]}
        </button>

        <button type="button" className="printer-modal__close" onClick={onClose}>
          {STRINGS.done[language]}
        </button>
      </div>
    </div>
  );
}
