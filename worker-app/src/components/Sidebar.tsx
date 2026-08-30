import { useState } from "react";
import { ConfirmDialog, SyncStatusBadge, useLanguage, type SyncStatus } from "@kumbakonam/shared";
import "./Sidebar.css";

export interface SidebarProps {
  syncStatus: SyncStatus;
  onOpenKhata: () => void;
  onOpenExpenses: () => void;
  onOpenPrinterSetup: () => void;
  onLogout: () => void;
}

const STRINGS = {
  language: { en: "Language", ta: "மொழி" },
  khata: { en: "Credit book", ta: "கடன் புத்தகம்" },
  expenses: { en: "Record spending", ta: "செலவு பதிவு" },
  printerSetup: { en: "Printer setup", ta: "பிரிண்டர் அமைப்பு" },
  logOut: { en: "Log out", ta: "வெளியேறு" },
  logoutTitle: { en: "Log out?", ta: "வெளியேறவா?" },
  logoutMessage: {
    en: "You'll need to enter your PIN again to keep taking orders.",
    ta: "மீண்டும் ஆர்டர் எடுக்க உங்கள் பின் எண்ணை மீண்டும் உள்ளிட வேண்டும்.",
  },
  logoutConfirm: { en: "Log Out", ta: "வெளியேறு" },
};

/**
 * These three captions are fixed Tamil words, not translated through
 * `language` — the same "always Tamil" choice the printed receipt makes
 * (see worker-app/src/printing/cafeDetails.ts): they're short enough to
 * read as labels rather than sentences, and staying put means a worker who
 * knows this sidebar by shape doesn't have it relabel itself under them
 * when someone else on shift taps the language toggle.
 */
const CAPTION = {
  language: "மொழி",
  khata: "கடன்",
  expenses: "செலவு",
};

/** Thin icon sidebar (Design Brief §5) — sync status, language, credit book, spending, printer, logout. */
export function Sidebar({ syncStatus, onOpenKhata, onOpenExpenses, onOpenPrinterSetup, onLogout }: SidebarProps) {
  const { language, toggleLanguage } = useLanguage();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <div className="sidebar">
      {/* Was a plain "K" mark — the app's own identity here duplicated the
          logo already on screen in the header and said nothing useful. The
          one thing worth a fixed, always-visible slot at the top of a
          counter tablet is whether the last order actually reached the
          server, so that's what sits here now. */}
      <SyncStatusBadge status={syncStatus} compact />

      <div className="sidebar__actions">
        <button
          type="button"
          className="sidebar__icon-btn sidebar__icon-btn--labeled"
          onClick={toggleLanguage}
          aria-label={STRINGS.language[language]}
          title={STRINGS.language[language]}
        >
          <span className="sidebar__icon-glyph" aria-hidden="true">
            🌐
          </span>
          <span className="sidebar__icon-caption">{CAPTION.language}</span>
        </button>
        <button
          type="button"
          className="sidebar__icon-btn sidebar__icon-btn--labeled"
          onClick={onOpenKhata}
          aria-label={STRINGS.khata[language]}
          title={STRINGS.khata[language]}
        >
          <span className="sidebar__icon-glyph" aria-hidden="true">
            📒
          </span>
          <span className="sidebar__icon-caption">{CAPTION.khata}</span>
        </button>
        <button
          type="button"
          className="sidebar__icon-btn sidebar__icon-btn--labeled"
          onClick={onOpenExpenses}
          aria-label={STRINGS.expenses[language]}
          title={STRINGS.expenses[language]}
        >
          <span className="sidebar__icon-glyph" aria-hidden="true">
            💸
          </span>
          <span className="sidebar__icon-caption">{CAPTION.expenses}</span>
        </button>
        <button
          type="button"
          className="sidebar__icon-btn"
          onClick={onOpenPrinterSetup}
          aria-label={STRINGS.printerSetup[language]}
        >
          🖨
        </button>
        <button
          type="button"
          className="sidebar__icon-btn"
          onClick={() => setConfirmingLogout(true)}
          aria-label={STRINGS.logOut[language]}
        >
          ⏻
        </button>
      </div>

      {confirmingLogout && (
        <ConfirmDialog
          title={STRINGS.logoutTitle[language]}
          message={STRINGS.logoutMessage[language]}
          confirmLabel={STRINGS.logoutConfirm[language]}
          onConfirm={() => {
            setConfirmingLogout(false);
            onLogout();
          }}
          onCancel={() => setConfirmingLogout(false)}
        />
      )}
    </div>
  );
}
