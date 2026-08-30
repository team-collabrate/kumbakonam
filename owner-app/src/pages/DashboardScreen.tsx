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

  const daily = useOrdersInRange(dailyRange);
  const weekly = useOrdersInRange(weeklyRange);
  const monthly = useOrdersInRange(monthlyRange);
  const dailySpend = useExpensesInRange(dailyRange);
  const customers = useCustomers();

  const dailyStats = useMemo(() => computeDashboardStats(daily.orders), [daily.orders]);
  const weeklyTotal = useMemo(() => computeDashboardStats(weekly.orders).totalSales, [weekly.orders]);
  const monthlyTotal = useMemo(() => computeDashboardStats(monthly.orders).totalSales, [monthly.orders]);

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
            <p className="today-card__label">{STRINGS.todaySales[language]}</p>
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
