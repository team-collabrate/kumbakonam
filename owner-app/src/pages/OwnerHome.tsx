import { useEffect, useState } from "react";
import {
  archiveAndPruneOldData,
  businessDayKey,
  SyncStatusBadge,
  useOnlineStatus,
  type SessionUser,
} from "@kumbakonam/shared";
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

  // Best-effort, once per app load — this is what makes the 2-day retention
  // "automatic" without Cloud Functions (see archiveAndPruneOldData's own
  // comment for why, and the limitation: an owner who doesn't open the app
  // for a few days just means the next open archives a slightly bigger
  // backlog, not that anything goes uncleaned). Runs regardless of which
  // tab is open, so it's here rather than inside ReportsScreen. Saves each
  // affected day's totals to `dailySummaries` before deleting that day's
  // orders/expenses — unlike the old pruneOldOrders, history doesn't just
  // vanish once it falls out of the 2-day detail window.
  //
  // Was narrowed to 2 days (today/yesterday) on 2026-09-03, then widened
  // back to 3 (today/yesterday/day-before) on 2026-09-03 later the same day
  // — the new standalone item-sales report (reports-app/) needs real
  // per-item detail for a 3rd day, which only exists while its orders are
  // still live (dailySummaries only ever keeps a day's *total*, never its
  // item list — see that collection's own comment). firestore.rules' own
  // delete-age floor stayed at 2 days on purpose: it's a floor, not the
  // exact window, so a 3-day cutoff here (stricter) still satisfies it —
  // no rules change needed to widen this back.
  //
  // Guarded to run at most once per business day (added 2026-09-03, same
  // day the project's Firestore read quota got exhausted) — this used to
  // fire on every single mount of OwnerHome, i.e. every time the dashboard
  // PWA was opened, which for a phone checked repeatedly through a live
  // business day meant re-running the same "orders older than cutoff"
  // scan (and its expenses counterpart) many times over for work already
  // done. The scan itself is real Firestore reads regardless of whether
  // there's anything left to archive; a stale cross-tab localStorage flag
  // just means one extra opener that same day still tries once, which is
  // fine — the goal is cutting redundant *repeat* runs, not a hard lock.
  useEffect(() => {
    const key = "kumbakonam.archivePruneLastRun";
    const today = businessDayKey(new Date());
    try {
      if (localStorage.getItem(key) === today) return;
    } catch {
      // Storage unavailable (private mode) — falls through and runs anyway,
      // same as before this guard existed.
    }
    archiveAndPruneOldData(3)
      .then(() => {
        try {
          localStorage.setItem(key, today);
        } catch {
          /* best-effort only — see above */
        }
      })
      .catch((err) => console.error("Data archiving/pruning failed (non-fatal)", err));
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
