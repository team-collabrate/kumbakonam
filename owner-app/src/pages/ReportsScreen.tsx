import { useMemo, useState } from "react";
import { formatCurrency, useLanguage, useSession, type Customer } from "@kumbakonam/shared";
import { getRange, type RangeMode } from "../utils/dateRange";
import { useOrdersInRange } from "../hooks/useOrdersInRange";
import { useExpensesInRange } from "../hooks/useExpensesInRange";
import { useDailySummariesInRange } from "../hooks/useDailySummariesInRange";
import { useCustomers } from "../hooks/useCustomers";
import { bucketByDayOfWeek, bucketByHour, bucketByRecentDay, bucketByWeekOfMonth } from "../utils/chartBuckets";
import { computeDashboardStats } from "../utils/dashboardStats";
import { RangeSegmentedControl } from "../components/RangeSegmentedControl";
import { SalesChart } from "../components/SalesChart";
import { OrderHistoryRow } from "../components/OrderHistoryRow";
import { WorkerLegend } from "../components/WorkerLegend";
import { ExpenseHistoryRow } from "../components/ExpenseHistoryRow";
import { RecordPaymentModal } from "../components/RecordPaymentModal";
import { RecordExpenseModal } from "../components/RecordExpenseModal";
import "./ReportsScreen.css";

const STRINGS = {
  title: { en: "Reports", ta: "அறிக்கைகள்" },
  orderHistory: { en: "Order History", ta: "ஆர்டர் வரலாறு" },
  spending: { en: "Spending", ta: "செலவுகள்" },
  addExpense: { en: "+ Add", ta: "+ சேர்" },
  onCredit: { en: "Outstanding Credit", ta: "நிலுவை கடன்" },
  nobodyOwes: { en: "Nobody owes anything.", ta: "யாருக்கும் கடன் இல்லை." },
  collect: { en: "Collect", ta: "பணம் பெறு" },
  sales: { en: "Sales", ta: "விற்பனை" },
  spent: { en: "Spent", ta: "செலவு" },
  net: { en: "Net", ta: "நிகர" },
  loading: { en: "Loading…", ta: "ஏற்றுகிறது…" },
  empty: { en: "No orders in this period.", ta: "இந்தக் காலத்தில் ஆர்டர்கள் இல்லை." },
  emptySpending: { en: "Nothing recorded in this period.", ta: "இந்தக் காலத்தில் பதிவு இல்லை." },
};

export function ReportsScreen() {
  const { language } = useLanguage();
  const { sessionUser } = useSession();
  // Defaults to the 3-day window (today/yesterday/day-before) — the same
  // window archiveAndPruneOldData keeps, and what the owner asked to see
  // first.
  const [mode, setMode] = useState<RangeMode>("recent");
  const range = useMemo(() => getRange(mode), [mode]);
  const { orders, loading, error } = useOrdersInRange(range);
  const spend = useExpensesInRange(range);
  // Only ever nonzero once `range` reaches past the 3-day detail window
  // (weekly/monthly) — see useDailySummariesInRange's own comment on why
  // adding this to the live totals below never double-counts a day.
  const archived = useDailySummariesInRange(range);
  const customers = useCustomers();
  // The worker app has always been able to take a payment (KhataModal) and
  // record spending (ExpenseModal) — the owner app could only watch both
  // happen from the dashboard, with no equivalent action of its own. Both
  // service calls already accept the owner role at the Firestore rules
  // layer; this was a missing screen, not a missing permission.
  const [collectingFrom, setCollectingFrom] = useState<Customer | null>(null);
  const [addingExpense, setAddingExpense] = useState(false);

  // Reuses computeDashboardStats purely for its voided-order exclusion —
  // this screen only needs the one number, not the rest of the shape.
  // Plus `archived`, for whatever portion of the range has already aged
  // out of live order/expense detail (see useDailySummariesInRange).
  const totalSales = useMemo(
    () => computeDashboardStats(orders).totalSales + archived.totalSales,
    [orders, archived.totalSales],
  );
  const totalSpent = spend.totalSpent + archived.totalSpent;
  const net = totalSales - totalSpent;

  // Display order only — `orders` itself stays chronological (createdAt
  // desc, straight off the query) for the chart bucketing and totals above,
  // which need real time order, not this. Voided bills float to the top of
  // the *list* so a just-deleted bill doesn't get lost between two live
  // ones — most-recently-voided first, then the rest in their usual
  // newest-first order (both groups are already sorted desc going in, so a
  // filter+concat keeps each group's own recency order intact).
  const displayOrders = useMemo(() => {
    const voided = orders.filter((o) => o.status === "voided");
    const active = orders.filter((o) => o.status !== "voided");
    return [...voided, ...active];
  }, [orders]);

  // Either subscription failing means the figures below would be wrong
  // rather than merely incomplete, so one error hides the whole report.
  const failure = error ?? spend.error ?? customers.error ?? archived.error;

  const chartData = useMemo(() => {
    if (mode === "recent") return bucketByRecentDay(orders, range.start, language);
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
              <dd className="is-spend">−{formatCurrency(totalSpent)}</dd>
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
            {orders.length > 0 && <WorkerLegend />}
            {loading ? (
              <p className="reports-screen__status">{STRINGS.loading[language]}</p>
            ) : orders.length === 0 ? (
              <p className="reports-screen__status">{STRINGS.empty[language]}</p>
            ) : (
              displayOrders.map((order) => <OrderHistoryRow key={order.orderId} order={order} />)
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
                  {sessionUser && (
                    <button
                      type="button"
                      className="reports-screen__collect"
                      onClick={() => setCollectingFrom(customer)}
                    >
                      {STRINGS.collect[language]}
                    </button>
                  )}
                </div>
              ))
            )}
          </section>

          <section className="reports-screen__history">
            <div className="reports-screen__history-header">
              <h2 className="reports-screen__history-title">{STRINGS.spending[language]}</h2>
              {sessionUser && (
                <button type="button" className="reports-screen__add" onClick={() => setAddingExpense(true)}>
                  {STRINGS.addExpense[language]}
                </button>
              )}
            </div>
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

      {collectingFrom && sessionUser && (
        <RecordPaymentModal
          customer={collectingFrom}
          ownerId={sessionUser.userId}
          onClose={() => setCollectingFrom(null)}
        />
      )}

      {addingExpense && sessionUser && (
        <RecordExpenseModal ownerId={sessionUser.userId} onClose={() => setAddingExpense(false)} />
      )}
    </div>
  );
}
