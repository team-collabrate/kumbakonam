import { PinEntryScreen, useSession } from "@kumbakonam/shared";
import { WorkerHome } from "./pages/WorkerHome";

export function App() {
  const { ready, sessionUser, loading, error, login, logout } = useSession();

  if (!sessionUser) {
    return (
      <PinEntryScreen
        theme="dark"
        title="Kumbakonam POS"
        subtitle={ready ? "Enter your PIN" : "Connecting…"}
        onSubmit={login}
        loading={loading || !ready}
        error={error}
      />
    );
  }

  return <WorkerHome sessionUser={sessionUser} onLogout={logout} />;
}
