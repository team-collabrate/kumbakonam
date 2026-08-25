import { useState } from "react";
import type { SessionUser } from "@kumbakonam/shared";
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

  return (
    <div className="owner-home" data-theme="light">
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
