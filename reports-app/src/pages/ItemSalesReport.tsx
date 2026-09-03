import { useEffect, useMemo, useState } from "react";
import {
  describeFirestoreError,
  formatCurrency,
  LanguageToggle,
  subscribeToOrdersInRange,
  useLanguage,
  type Order,
} from "@kumbakonam/shared";
import { buildItemSalesReport, nthBusinessDayStart } from "../utils/itemSalesReport";
import { exportItemSalesXlsx } from "../utils/exportXlsx";
import "./ItemSalesReport.css";

const STRINGS = {
  title: { en: "Sales Report", ta: "விற்பனை அறிக்கை" },
  subtitle: { en: "Last 3 days, item by item", ta: "கடந்த 3 நாட்கள், பொருள் வாரியாக" },
  export: { en: "Export XLSX", ta: "XLSX ஏற்றுமதி" },
  logout: { en: "Log out", ta: "வெளியேறு" },
  loading: { en: "Loading…", ta: "ஏற்றுகிறது…" },
  empty: { en: "No orders in the last 3 days.", ta: "கடந்த 3 நாட்களில் ஆர்டர்கள் இல்லை." },
  item: { en: "Item", ta: "பொருள்" },
  qty: { en: "Qty", ta: "எண்ணிக்கை" },
  rate: { en: "Rate", ta: "விலை" },
  amount: { en: "Amount", ta: "தொகை" },
  rateVaries: { en: "avg — sold at more than one price", ta: "சராசரி — ஒன்றுக்கு மேற்பட்ட விலையில் விற்பனை" },
  total: { en: "Total", ta: "மொத்தம்" },
  orders: { en: "orders", ta: "ஆர்டர்கள்" },
};

export interface ItemSalesReportProps {
  onLogout: () => void;
}

/** Standalone page (its own Firebase Hosting site — see reports-app/README)
 *  answering one request: "what sold, how many, for how much, per day, for
 *  the last 3 days, downloadable as .xlsx". Modeled loosely on the
 *  dairy-reports.vercel.app reference the owner pointed at (date-grouped
 *  cards + an Export XLSX button), rebuilt for this app's own item-level
 *  data rather than that app's vendor-bill data, and gated by the same PIN
 *  login as the owner app rather than left open like that reference is. */
export function ItemSalesReport({ onLogout }: ItemSalesReportProps) {
  const { language } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    return { start: nthBusinessDayStart(now, 2), end: now };
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToOrdersInRange(
      range.start,
      range.end,
      (result) => {
        setError(null);
        setOrders(result);
        setLoading(false);
      },
      (err) => {
        console.error("Orders subscription failed", err);
        setError(describeFirestoreError(err, language));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [range.start, range.end, language]);

  const days = useMemo(() => buildItemSalesReport(orders, language), [orders, language]);

  return (
    <div className="sales-report">
      <header className="sales-report__header">
        <div>
          <h1 className="sales-report__title">{STRINGS.title[language]}</h1>
          <p className="sales-report__subtitle">{STRINGS.subtitle[language]}</p>
        </div>
        <div className="sales-report__actions">
          <LanguageToggle />
          <button
            type="button"
            className="sales-report__export"
            disabled={days.length === 0}
            onClick={() => exportItemSalesXlsx(days, "kumbakonam-sales")}
          >
            {STRINGS.export[language]}
          </button>
          <button type="button" className="sales-report__logout" onClick={onLogout}>
            {STRINGS.logout[language]}
          </button>
        </div>
      </header>

      {error ? (
        <p className="sales-report__error">{error}</p>
      ) : loading ? (
        <p className="sales-report__status">{STRINGS.loading[language]}</p>
      ) : days.length === 0 ? (
        <p className="sales-report__status">{STRINGS.empty[language]}</p>
      ) : (
        <div className="sales-report__days">
          {days.map((day) => (
            <section key={day.key} className="day-card">
              <div className="day-card__header">
                <h2 className="day-card__label">{day.label}</h2>
                <p className="day-card__meta">
                  {day.orderCount} {STRINGS.orders[language]}
                </p>
                <p className="day-card__total">{formatCurrency(day.totalSales)}</p>
              </div>
              <div className="day-card__table-wrap">
                <table className="day-card__table">
                  <thead>
                    <tr>
                      <th>{STRINGS.item[language]}</th>
                      <th className="is-numeric">{STRINGS.qty[language]}</th>
                      <th className="is-numeric">{STRINGS.rate[language]}</th>
                      <th className="is-numeric">{STRINGS.amount[language]}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.items.map((item) => (
                      <tr key={item.itemId}>
                        <td>{item.name}</td>
                        <td className="is-numeric">{item.qty}</td>
                        {/* Same display name can legitimately cover two
                            different itemIds at different prices (a menu
                            item re-added under a new id, a bulk/wholesale
                            rate billed under the retail name) — the rate
                            here, plus the itemId in the XLSX export, is
                            what tells those apart instead of them just
                            looking like an unexplained duplicate row. */}
                        <td className="is-numeric" title={item.rateVaries ? STRINGS.rateVaries[language] : undefined}>
                          {formatCurrency(item.rate)}
                          {item.rateVaries ? "*" : ""}
                        </td>
                        <td className="is-numeric">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>{STRINGS.total[language]}</td>
                      <td className="is-numeric" />
                      <td className="is-numeric" />
                      <td className="is-numeric">{formatCurrency(day.totalSales)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
