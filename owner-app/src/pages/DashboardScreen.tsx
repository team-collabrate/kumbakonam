import { useMemo } from "react";
import { formatCurrency } from "@kumbakonam/shared";
import { getRange } from "../utils/dateRange";
import { useOrdersInRange } from "../hooks/useOrdersInRange";
import { computeDashboardStats } from "../utils/dashboardStats";
import { StatCard } from "../components/StatCard";
import { TopItemsList } from "../components/TopItemsList";
import "./DashboardScreen.css";

export function DashboardScreen() {
  const range = useMemo(() => getRange("daily"), []);
  const { orders, loading, error } = useOrdersInRange(range);
  const stats = useMemo(() => computeDashboardStats(orders), [orders]);

  return (
    <div className="dashboard-screen">
      <h1 className="dashboard-screen__title">Today</h1>

      {error ? (
        <p className="dashboard-screen__error">{error}</p>
      ) : (
        <>
          <div className="dashboard-screen__stats">
            <StatCard label="Today's Sales" value={formatCurrency(stats.totalSales)} />
            <StatCard label="Orders" value={String(stats.orderCount)} />
            <StatCard label="Avg Order" value={formatCurrency(stats.avgOrderValue)} />
          </div>

          <section className="dashboard-screen__section">
            <h2 className="dashboard-screen__section-title">Top Items</h2>
            {loading ? (
              <p className="dashboard-screen__loading">Loading…</p>
            ) : (
              <TopItemsList items={stats.topItems} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
