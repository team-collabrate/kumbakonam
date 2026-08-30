import { useMemo, useState } from "react";
import { formatCurrency, useLanguage } from "@kumbakonam/shared";
import { getRange, type RangeMode } from "../utils/dateRange";
import { useOrdersInRange } from "../hooks/useOrdersInRange";
import { useExpensesInRange } from "../hooks/useExpensesInRange";
import { useCustomers } from "../hooks/useCustomers";
import { bucketByDayOfWeek, bucketByHour, bucketByWeekOfMonth } from "../utils/chartBuckets";
import { computeDashboardStats } from "../utils/dashboardStats";
import { RangeSegmentedControl } from "../components/RangeSegmentedControl";
import { SalesChart } from "../components/SalesChart";
import { OrderHistoryRow } from "../components/OrderHistoryRow";
import { ExpenseHistoryRow } from "../components/ExpenseHistoryRow";
import "./ReportsScreen.css";

const STRINGS = {
  title: { en: "Reports", ta: "அறிக்கைகள்" },
  orderHistory: { en: "Order History", ta: "ஆர்டர் வரலாறு" },
  spending: { en: "Spending", ta: "செலவுகள்" },
  onCredit: { en: "Outstanding Credit", ta: "நிலுவை கடன்" },
  nobodyOwes: { en: "Nobody owes anything.", ta: "யாருக்கும் கடன் இல்லை." },
  sales: { en: "Sales", ta: "விற்பனை" },
  spent: { en: "Spent", ta: "செலவு" },
  net: { en: "Net", ta: "நிகர" },
  loading: { en: "Loading…", ta: "ஏற்றுகிறது…" },
  empty: { en: "No orders in this period.", ta: "இந்தக் காலத்தில் ஆர்டர்கள் இல்லை." },
  emptySpending: { en: "Nothing recorded in this period.", ta: "இந்தக் காலத்தில் பதிவு இல்லை." },
};

export function ReportsScreen() {
  const { language } = useLanguage();
  const [mode, setMode] = useState<RangeMode>("daily");
  const range = useMemo(() => getRange(mode), [mode]);
  const { orders, loading, error } = useOrdersInRange(range);
  const spend = useExpensesInRange(range);
  const customers = useCustomers();

  // Reuses computeDashboardStats purely for its voided-order exclusion —
  // this screen only needs the one number, not the rest of the shape.
  const totalSales = useMemo(() => computeDashboardStats(orders).totalSales, [orders]);
  const net = totalSales - spend.totalSpent;

  // Either subscription failing means the figures below would be wrong
  // rather than merely incomplete, so one error hides the whole report.
  const failure = error ?? spend.error ?? customers.error;

  const chartData = useMemo(() => {
    if (mode === "daily") return bucketByHour(orders);
    if (mode === "weekly") return bucketByDayOfWeek(orders, language);
    return bucketByWeekOfMonth(orders, range.start, language);
  }, [mode, orders, range.start, language]);

  return (
    <div className="reports-screen">
      <h1 className="reports-screen__title">{STRINGS.title[language]}</h1>
      <RangeSegmentedControl value={mode} onChange={setMode} />

      {failure ? (
        <p className="reports-screen__error">{failure}</p>
      ) : (
        <>
          {/* What the period came to, before the detail below explains it. */}
          <dl className="reports-screen__summary">
            <div>
              <dt>{STRINGS.sales[language]}</dt>
              <dd>{formatCurrency(totalSales)}</dd>
            </div>
            <div>
              <dt>{STRINGS.spent[language]}</dt>
              <dd className="is-spend">−{formatCurrency(spend.totalSpent)}</dd>
            </div>
            <div>
              <dt>{STRINGS.net[language]}</dt>
              <dd className={net < 0 ? "is-negative" : "is-net"}>{formatCurrency(net)}</dd>
            </div>
          </dl>

          <section className="reports-screen__chart">
            <SalesChart data={chartData} />
          </section>

          <section className="reports-screen__history">
            <h2 className="reports-screen__history-title">{STRINGS.orderHistory[language]}</h2>
            {loading ? (
              <p className="reports-screen__status">{STRINGS.loading[language]}</p>
            ) : orders.length === 0 ? (
              <p className="reports-screen__status">{STRINGS.empty[language]}</p>
            ) : (
              orders.map((order) => <OrderHistoryRow key={order.orderId} order={order} />)
            )}
          </section>

          {/* Balances are a running total, not a figure for this period —
              they sit below the period sections for that reason. */}
          <section className="reports-screen__history">
            <h2 className="reports-screen__history-title">{STRINGS.onCredit[language]}</h2>
            {customers.loading ? (
              <p className="reports-screen__status">{STRINGS.loading[language]}</p>
            ) : customers.outstanding.length === 0 ? (
              <p className="reports-screen__status">{STRINGS.nobodyOwes[language]}</p>
            ) : (
              customers.outstanding.map((customer) => (
                <div className="expense-row" key={customer.customerId}>
                  <span className="expense-row__name">{customer.name}</span>
                  <span className="expense-row__amount">{formatCurrency(customer.balance)}</span>
                </div>
              ))
            )}
          </section>

          <section className="reports-screen__history">
            <h2 className="reports-screen__history-title">{STRINGS.spending[language]}</h2>
            {spend.loading ? (
              <p className="reports-screen__status">{STRINGS.loading[language]}</p>
            ) : spend.expenses.length === 0 ? (
              <p className="reports-screen__status">{STRINGS.emptySpending[language]}</p>
            ) : (
              spend.expenses.map((expense) => (
                <ExpenseHistoryRow key={expense.expenseId} expense={expense} />
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
