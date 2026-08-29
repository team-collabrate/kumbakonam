import { useState } from "react";
import { ConfirmDialog, LanguageToggle, useLanguage } from "@kumbakonam/shared";
import "./Sidebar.css";

export interface SidebarProps {
  onOpenExpenses: () => void;
  onOpenPrinterSetup: () => void;
  onLogout: () => void;
}

const STRINGS = {
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

/** Thin icon sidebar (Design Brief §5) — spending, printer setup, logout. */
export function Sidebar({ onOpenExpenses, onOpenPrinterSetup, onLogout }: SidebarProps) {
  const { language } = useLanguage();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <div className="sidebar">
      <span className="sidebar__mark" aria-hidden="true">
        K
      </span>
      <div className="sidebar__actions">
        <LanguageToggle />
        <button
          type="button"
          className="sidebar__icon-btn"
          onClick={onOpenExpenses}
          aria-label={STRINGS.expenses[language]}
          title={STRINGS.expenses[language]}
        >
          💸
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
