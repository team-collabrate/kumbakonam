import { PinEntryScreen, useSession } from "@kumbakonam/shared";
import { OwnerHome } from "./pages/OwnerHome";

export function App() {
  const { ready, sessionUser, loading, error, login, logout } = useSession();

  if (!sessionUser) {
    return (
      <PinEntryScreen
        theme="light"
        title="Kumbakonam Dashboard"
        subtitle={ready ? "Enter your PIN" : "Connecting…"}
        onSubmit={login}
        loading={loading || !ready}
        error={error}
      />
    );
  }

  return <OwnerHome sessionUser={sessionUser} onLogout={logout} />;
}
