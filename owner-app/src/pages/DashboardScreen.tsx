import { useMemo, useState } from "react";
import { formatCurrency, useLanguage } from "@kumbakonam/shared";
import { getRange } from "../utils/dateRange";
import { useOrdersInRange } from "../hooks/useOrdersInRange";
import { computeDashboardStats } from "../utils/dashboardStats";
import { bucketByDayOfWeek, bucketByWeekOfMonth } from "../utils/chartBuckets";
import { StatCard } from "../components/StatCard";
import { TopItemsList } from "../components/TopItemsList";
import { ValueGraphCard, type GraphMode } from "../components/ValueGraphCard";
import "./DashboardScreen.css";

const STRINGS = {
  title: { en: "Dashboard", ta: "டாஷ்போர்டு" },
  todaySales: { en: "Today's Sales", ta: "இன்றைய விற்பனை" },
  weeklySales: { en: "Weekly Sales", ta: "வார விற்பனை" },
  monthlySales: { en: "Monthly Sales", ta: "மாத விற்பனை" },
  ordersToday: { en: "Orders Today", ta: "இன்றைய ஆர்டர்கள்" },
  avgOrderToday: { en: "Avg Order Today", ta: "இன்றைய சராசரி ஆர்டர்" },
  topItemsToday: { en: "Top Items Today", ta: "இன்றைய முக்கிய பொருட்கள்" },
  loading: { en: "Loading…", ta: "ஏற்றுகிறது…" },
};

export function DashboardScreen() {
  const { language } = useLanguage();
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
    if (graphMode === "weekly") return bucketByDayOfWeek(weekly.orders, language);
    return bucketByWeekOfMonth(monthly.orders, monthlyRange.start, language);
  }, [graphMode, weekly.orders, monthly.orders, monthlyRange.start, language]);

  const graphLoading = graphMode === "weekly" ? weekly.loading : monthly.loading;
  const error = daily.error ?? weekly.error ?? monthly.error;

  return (
    <div className="dashboard-screen">
      <h1 className="dashboard-screen__title">{STRINGS.title[language]}</h1>

      {error ? (
        <p className="dashboard-screen__error">{error}</p>
      ) : (
        <>
          <ValueGraphCard mode={graphMode} onModeChange={setGraphMode} data={graphData} loading={graphLoading} />

          <div className="dashboard-screen__stats">
            <StatCard label={STRINGS.todaySales[language]} value={formatCurrency(dailyStats.totalSales)} />
            <StatCard label={STRINGS.weeklySales[language]} value={formatCurrency(weeklyTotal)} />
            <StatCard label={STRINGS.monthlySales[language]} value={formatCurrency(monthlyTotal)} />
          </div>

          <div className="dashboard-screen__stats dashboard-screen__stats--secondary">
            <StatCard label={STRINGS.ordersToday[language]} value={String(dailyStats.orderCount)} />
            <StatCard label={STRINGS.avgOrderToday[language]} value={formatCurrency(dailyStats.avgOrderValue)} />
          </div>

          <section className="dashboard-screen__section">
            <h2 className="dashboard-screen__section-title">{STRINGS.topItemsToday[language]}</h2>
            {daily.loading ? (
              <p className="dashboard-screen__loading">{STRINGS.loading[language]}</p>
            ) : (
              <TopItemsList items={dailyStats.topItems} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
