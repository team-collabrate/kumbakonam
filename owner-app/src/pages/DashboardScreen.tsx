import { useMemo, useState } from "react";
import { formatCurrency } from "@kumbakonam/shared";
import { getRange } from "../utils/dateRange";
import { useOrdersInRange } from "../hooks/useOrdersInRange";
import { computeDashboardStats } from "../utils/dashboardStats";
import { bucketByDayOfWeek, bucketByWeekOfMonth } from "../utils/chartBuckets";
import { StatCard } from "../components/StatCard";
import { TopItemsList } from "../components/TopItemsList";
import { ValueGraphCard, type GraphMode } from "../components/ValueGraphCard";
import "./DashboardScreen.css";

export function DashboardScreen() {
  const [graphMode, setGraphMode] = useState<GraphMode>("weekly");

  const dailyRange = useMemo(() => getRange("daily"), []);
  const weeklyRange = useMemo(() => getRange("weekly"), []);
  const monthlyRange = useMemo(() => getRange("monthly"), []);

  const daily = useOrdersInRange(dailyRange);
  const weekly = useOrdersInRange(weeklyRange);
  const monthly = useOrdersInRange(monthlyRange);

  const dailyStats = useMemo(() => computeDashboardStats(daily.orders), [daily.orders]);
  const weeklyTotal = useMemo(() => computeDashboardStats(weekly.orders).totalSales, [weekly.orders]);
  const monthlyTotal = useMemo(() => computeDashboardStats(monthly.orders).totalSales, [monthly.orders]);

  const graphData = useMemo(() => {
    if (graphMode === "weekly") return bucketByDayOfWeek(weekly.orders);
    return bucketByWeekOfMonth(monthly.orders, monthlyRange.start);
  }, [graphMode, weekly.orders, monthly.orders, monthlyRange.start]);

  const graphLoading = graphMode === "weekly" ? weekly.loading : monthly.loading;
  const error = daily.error ?? weekly.error ?? monthly.error;

  return (
    <div className="dashboard-screen">
      <h1 className="dashboard-screen__title">Dashboard</h1>

      {error ? (
        <p className="dashboard-screen__error">{error}</p>
      ) : (
        <>
          <ValueGraphCard mode={graphMode} onModeChange={setGraphMode} data={graphData} loading={graphLoading} />

          <div className="dashboard-screen__stats">
            <StatCard label="Today's Sales" value={formatCurrency(dailyStats.totalSales)} />
            <StatCard label="Weekly Sales" value={formatCurrency(weeklyTotal)} />
            <StatCard label="Monthly Sales" value={formatCurrency(monthlyTotal)} />
          </div>

          <div className="dashboard-screen__stats dashboard-screen__stats--secondary">
            <StatCard label="Orders Today" value={String(dailyStats.orderCount)} />
            <StatCard label="Avg Order Today" value={formatCurrency(dailyStats.avgOrderValue)} />
          </div>

          <section className="dashboard-screen__section">
            <h2 className="dashboard-screen__section-title">Top Items Today</h2>
            {daily.loading ? (
              <p className="dashboard-screen__loading">Loading…</p>
            ) : (
              <TopItemsList items={dailyStats.topItems} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
