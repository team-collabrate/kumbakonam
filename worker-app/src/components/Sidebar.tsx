import { useState } from "react";
import { ConfirmDialog } from "@kumbakonam/shared";
import "./Sidebar.css";

export interface SidebarProps {
  onOpenPrinterSetup: () => void;
  onLogout: () => void;
}

/** Thin icon sidebar (Design Brief §5) — printer setup + logout. */
export function Sidebar({ onOpenPrinterSetup, onLogout }: SidebarProps) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <div className="sidebar">
      <span className="sidebar__mark" aria-hidden="true">
        K
      </span>
      <div className="sidebar__actions">
        <button type="button" className="sidebar__icon-btn" onClick={onOpenPrinterSetup} aria-label="Printer setup">
          🖨
        </button>
        <button type="button" className="sidebar__icon-btn" onClick={() => setConfirmingLogout(true)} aria-label="Log out">
          ⏻
        </button>
      </div>

      {confirmingLogout && (
        <ConfirmDialog
          title="Log out?"
          message="You'll need to enter your PIN again to keep taking orders."
          confirmLabel="Log Out"
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
