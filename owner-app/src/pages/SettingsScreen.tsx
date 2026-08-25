import { useState } from "react";
import { ConfirmDialog, type SessionUser } from "@kumbakonam/shared";
import "./SettingsScreen.css";

export interface SettingsScreenProps {
  sessionUser: SessionUser;
  onLogout: () => void;
}

export function SettingsScreen({ sessionUser, onLogout }: SettingsScreenProps) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <div className="settings-screen">
      <h1 className="settings-screen__title">Settings</h1>

      <div className="settings-screen__card">
        <p className="settings-screen__label">Signed in as</p>
        <p className="settings-screen__name">{sessionUser.name}</p>
      </div>

      <button type="button" className="settings-screen__logout" onClick={() => setConfirmingLogout(true)}>
        Log out
      </button>

      {confirmingLogout && (
        <ConfirmDialog
          title="Log out?"
          message="You'll need to enter your PIN again to get back in."
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
