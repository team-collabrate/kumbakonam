import { PinEntryScreen, useLanguage, useSession } from "@kumbakonam/shared";
import { OwnerHome } from "./pages/OwnerHome";

const STRINGS = {
  subtitleReady: { en: "Enter your PIN", ta: "உங்கள் பின் எண்ணை உள்ளிடவும்" },
  subtitleConnecting: { en: "Connecting…", ta: "இணைக்கிறது…" },
};

export function App() {
  const { ready, sessionUser, loading, error, login, logout } = useSession();
  const { language } = useLanguage();

  if (!sessionUser) {
    return (
      <PinEntryScreen
        theme="light"
        title="Kumbakonam Dashboard"
        subtitle={ready ? STRINGS.subtitleReady[language] : STRINGS.subtitleConnecting[language]}
        onSubmit={login}
        loading={loading || !ready}
        error={error}
      />
    );
  }

  return <OwnerHome sessionUser={sessionUser} onLogout={logout} />;
}
