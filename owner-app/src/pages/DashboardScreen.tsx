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
  today: { en: "Today", ta: "இன்று" },
  todaySales: { en: "Today's Sales", ta: "இன்றைய விற்பனை" },
  spent: { en: "Spent", ta: "செலவு" },
  net: { en: "Net", ta: "நிகர" },
  thisPeriod: { en: "This week & month", ta: "இந்த வாரம் & மாதம்" },
  weeklySales: { en: "Week", ta: "வாரம்" },
  monthlySales: { en: "Month", ta: "மாதம்" },
  ordersToday: { en: "Orders", ta: "ஆர்டர்கள்" },
  gpayToday: { en: "GPay", ta: "GPay" },
  owed: { en: "Owed to you", ta: "வர வேண்டியது" },
  onCredit: { en: "On credit", ta: "நிலுவை கடன்" },
  acrossOne: { en: "from 1 customer", ta: "1 வாடிக்கையாளரிடம்" },
  acrossMany: { en: "from {n} customers", ta: "{n} வாடிக்கையாளர்களிடம்" },
  allSettled: { en: "Everyone has settled", ta: "அனைவரும் கடனை அடைத்துவிட்டனர்" },
  topItemsToday: { en: "Top Items Today", ta: "இன்றைய முக்கிய பொருட்கள்" },
  loading: { en: "Loading…", ta: "ஏற்றுகிறது…" },
};

export function DashboardScreen() {
  const { language } = useLanguage();
  const [graphMode, setGraphMode] = useState<GraphMode>("weekly");

  const dailyRange = useMemo(() => getRange("daily"), []);
  const weeklyRange = useMemo(() => getRange("weekly"), []);
  const monthlyRange = useMemo(() => getRange("monthly"), []);
  // getRange already takes a reference date — yesterday's window is just
  // "today's window, computed as of 24h ago", not a separate calculation.
  const yesterdayRange = useMemo(() => getRange("daily", new Date(Date.now() - 86400000)), []);

  const daily = useOrdersInRange(dailyRange);
  const weekly = useOrdersInRange(weeklyRange);
  const monthly = useOrdersInRange(monthlyRange);
  const yesterday = useOrdersInRange(yesterdayRange);
  const dailySpend = useExpensesInRange(dailyRange);
  const customers = useCustomers();

  const dailyStats = useMemo(() => computeDashboardStats(daily.orders), [daily.orders]);
  const weeklyTotal = useMemo(() => computeDashboardStats(weekly.orders).totalSales, [weekly.orders]);
  const monthlyTotal = useMemo(() => computeDashboardStats(monthly.orders).totalSales, [monthly.orders]);
  const yesterdayTotal = useMemo(() => computeDashboardStats(yesterday.orders).totalSales, [yesterday.orders]);

  // A real day-over-day change, not a decorative percentage — null when
  // there's nothing honest to compare against yet (no sales either day, or
  // yesterday had none — a percentage against zero is either 0/0 or an
  // infinite jump, neither of which tells the owner anything true).
  const salesChange = useMemo(() => {
    if (yesterdayTotal <= 0 || dailyStats.totalSales <= 0) return null;
    return Math.round(((dailyStats.totalSales - yesterdayTotal) / yesterdayTotal) * 100);
  }, [dailyStats.totalSales, yesterdayTotal]);

  const netToday = dailyStats.totalSales - dailySpend.totalSpent;
  const dayHasActivity = dailyStats.totalSales > 0 || dailySpend.totalSpent > 0;

  const graphData = useMemo(() => {
    if (graphMode === "weekly") return bucketByDayOfWeek(weekly.orders, language);
    return bucketByWeekOfMonth(monthly.orders, monthlyRange.start, language);
  }, [graphMode, weekly.orders, monthly.orders, monthlyRange.start, language]);

  const graphLoading = graphMode === "weekly" ? weekly.loading : monthly.loading;
  const error = daily.error ?? weekly.error ?? monthly.error ?? dailySpend.error ?? customers.error;

  const owedCount = customers.outstanding.length;
  const owedCaption =
    owedCount === 0
      ? STRINGS.allSettled[language]
      : owedCount === 1
        ? STRINGS.acrossOne[language]
        : STRINGS.acrossMany[language].replace("{n}", String(owedCount));

  return (
    <div className="dashboard-screen">
      <h1 className="dashboard-screen__title">{STRINGS.title[language]}</h1>

      {error ? (
        <p className="dashboard-screen__error">{error}</p>
      ) : (
        <>
          <ValueGraphCard mode={graphMode} onModeChange={setGraphMode} data={graphData} loading={graphLoading} />

          <h2 className="dashboard-screen__group">{STRINGS.today[language]}</h2>

          {/* One card, because money in / out / left is one story. Splitting
              it across rows of two and three is what stopped the columns
              lining up, and left the reader to work out the relationship. */}
          <section className="today-card">
            <div className="today-card__headline">
              <p className="today-card__label">{STRINGS.todaySales[language]}</p>
              {/* A real day-over-day change, not a decorative badge — absent
                  rather than shown as 0% or an infinite jump on the days
                  there's nothing honest to compare against (see salesChange). */}
              {salesChange !== null && (
                <span className={`today-card__change ${salesChange >= 0 ? "is-up" : "is-down"}`}>
                  {salesChange >= 0 ? "▲" : "▼"} {Math.abs(salesChange)}%
                </span>
              )}
            </div>
            <p className="today-card__value">{formatCurrency(dailyStats.totalSales)}</p>

            <dl className="today-card__split">
              <div>
                <dt>{STRINGS.spent[language]}</dt>
                <dd className={dailySpend.totalSpent > 0 ? "is-spend" : ""}>
                  {dailySpend.totalSpent > 0 ? "−" : ""}
                  {formatCurrency(dailySpend.totalSpent)}
                </dd>
              </div>
              <div>
                <dt>{STRINGS.net[language]}</dt>
                {/* Uncoloured until the day has done something: a red zero
                    before the first sale would read as a problem. */}
                <dd className={!dayHasActivity ? "" : netToday < 0 ? "is-negative" : "is-positive"}>
                  {formatCurrency(netToday)}
                </dd>
              </div>
            </dl>
          </section>

          <div className="dashboard-screen__pair">
            <StatCard label={STRINGS.ordersToday[language]} value={String(dailyStats.orderCount)} />
            {/* Only what actually reached the GPay account — a split
                bill's cash half isn't in this figure (see gpayCollected). */}
            <StatCard label={STRINGS.gpayToday[language]} value={formatCurrency(dailyStats.gpayCollected)} />
          </div>

          <h2 className="dashboard-screen__group">{STRINGS.thisPeriod[language]}</h2>

          <div className="dashboard-screen__pair">
            <StatCard label={STRINGS.weeklySales[language]} value={formatCurrency(weeklyTotal)} />
            <StatCard label={STRINGS.monthlySales[language]} value={formatCurrency(monthlyTotal)} />
          </div>

          {/* A running receivable, not a figure for today — so it gets its
              own group rather than sitting beside the day's counts. */}
          <h2 className="dashboard-screen__group">{STRINGS.owed[language]}</h2>

          <section className="owed-card">
            <div className="owed-card__text">
              <p className="owed-card__label">{STRINGS.onCredit[language]}</p>
              <p className="owed-card__caption">{owedCaption}</p>
            </div>
            <p className={`owed-card__value ${owedCount > 0 ? "is-spend" : ""}`}>
              {formatCurrency(customers.totalOutstanding)}
            </p>
          </section>

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
