import { useMemo, useState } from "react";
import { formatCurrency, useLanguage } from "@kumbakonam/shared";
import { getRange } from "../utils/dateRange";
import { useOrdersInRange } from "../hooks/useOrdersInRange";
import { useExpensesInRange } from "../hooks/useExpensesInRange";
import { useCustomers } from "../hooks/useCustomers";
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
  spentToday: { en: "Spent Today", ta: "இன்றைய செலவு" },
  netToday: { en: "Net Today", ta: "இன்றைய நிகர" },
  outstanding: { en: "On Credit", ta: "நிலுவை கடன்" },
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
  const dailySpend = useExpensesInRange(dailyRange);
  const customers = useCustomers();

  const dailyStats = useMemo(() => computeDashboardStats(daily.orders), [daily.orders]);
  const weeklyTotal = useMemo(() => computeDashboardStats(weekly.orders).totalSales, [weekly.orders]);
  const monthlyTotal = useMemo(() => computeDashboardStats(monthly.orders).totalSales, [monthly.orders]);

  const graphData = useMemo(() => {
    if (graphMode === "weekly") return bucketByDayOfWeek(weekly.orders, language);
    return bucketByWeekOfMonth(monthly.orders, monthlyRange.start, language);
  }, [graphMode, weekly.orders, monthly.orders, monthlyRange.start, language]);

  // What the day actually left behind, once the buying is taken off.
  const netToday = dailyStats.totalSales - dailySpend.totalSpent;

  const graphLoading = graphMode === "weekly" ? weekly.loading : monthly.loading;
  const error = daily.error ?? weekly.error ?? monthly.error ?? dailySpend.error ?? customers.error;

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
            <StatCard
              label={STRINGS.spentToday[language]}
              value={formatCurrency(dailySpend.totalSpent)}
              tone={dailySpend.totalSpent > 0 ? "spend" : "neutral"}
            />
            <StatCard
              label={STRINGS.netToday[language]}
              value={formatCurrency(netToday)}
              // Only coloured once the day has actually done something —
              // a red zero before the first sale would read as a problem.
              tone={dailyStats.totalSales === 0 && dailySpend.totalSpent === 0 ? "neutral" : netToday < 0 ? "negative" : "positive"}
            />
          </div>

          <div className="dashboard-screen__stats dashboard-screen__stats--secondary">
            {/* Not part of today's net: this is money already counted as a
                sale on the day it was taken, still waiting to be collected. */}
            <StatCard
              label={STRINGS.outstanding[language]}
              value={formatCurrency(customers.totalOutstanding)}
              tone={customers.totalOutstanding > 0 ? "spend" : "neutral"}
            />
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
