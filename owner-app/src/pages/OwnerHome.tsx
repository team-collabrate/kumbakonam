import { useEffect, useState } from "react";
import { archiveAndPruneOldData, SyncStatusBadge, useOnlineStatus, type SessionUser } from "@kumbakonam/shared";
import { BottomTabBar, type TabKey } from "../components/BottomTabBar";
import { DashboardScreen } from "./DashboardScreen";
import { ReportsScreen } from "./ReportsScreen";
import { MenuScreen } from "./MenuScreen";
import { SettingsScreen } from "./SettingsScreen";
import "./OwnerHome.css";

export interface OwnerHomeProps {
  sessionUser: SessionUser;
  onLogout: () => void;
}

export function OwnerHome({ sessionUser, onLogout }: OwnerHomeProps) {
  const [tab, setTab] = useState<TabKey>("dashboard");
  // The worker app has carried this same badge since early on — the owner
  // app had none at all until now, so a dropped connection here looked
  // identical to a healthy one: the numbers just quietly stopped moving.
  // Same navigator.onLine signal the worker app already trusts, not a new
  // mechanism; it can read "online" on wifi with no real internet (a
  // captive portal, a router with no uplink), so it's a real improvement
  // over nothing but not a guarantee the dashboard is live this second.
  const online = useOnlineStatus();

  // Best-effort, once per app load — this is what makes the 3-day retention
  // "automatic" without Cloud Functions (see archiveAndPruneOldData's own
  // comment for why, and the limitation: an owner who doesn't open the app
  // for a few days just means the next open archives a slightly bigger
  // backlog, not that anything goes uncleaned). Runs regardless of which
  // tab is open, so it's here rather than inside ReportsScreen. Saves each
  // affected day's totals to `dailySummaries` before deleting that day's
  // orders/expenses — unlike the old pruneOldOrders, history doesn't just
  // vanish once it falls out of the 3-day detail window.
  useEffect(() => {
    archiveAndPruneOldData(3).catch((err) => console.error("Data archiving/pruning failed (non-fatal)", err));
  }, []);

  return (
    <div className="owner-home" data-theme="light">
      {/* One strip for every tab, not per-screen — the owner needs this
          regardless of whether they're looking at the dashboard, reports,
          the menu, or settings. */}
      <div className="owner-home__status-bar">
        <SyncStatusBadge status={online ? "online" : "offline"} />
      </div>
      <div className="owner-home__content">
        {tab === "dashboard" && <DashboardScreen />}
        {tab === "reports" && <ReportsScreen />}
        {tab === "menu" && <MenuScreen />}
        {tab === "settings" && <SettingsScreen sessionUser={sessionUser} onLogout={onLogout} />}
      </div>
      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  );
}
