import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@kumbakonam/shared/theme.css";
import { initFirebase, SessionProvider } from "@kumbakonam/shared";
import { App } from "./App";

// Worker app gets offline persistence — it must keep taking orders on flaky cafe wifi (TDD §4).
initFirebase({ offlinePersistence: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider expectedRole="worker">
      <App />
    </SessionProvider>
  </StrictMode>,
);
