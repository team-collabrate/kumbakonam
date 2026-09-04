import { useEffect, useState } from "react";
import {
  describeFirestoreError,
  formatCurrency,
  subscribeToOutstandingCustomers,
  useLanguage,
  type Customer,
} from "@kumbakonam/shared";
import { exportLoanXlsx } from "../utils/exportXlsx";

const STRINGS = {
  title: { en: "Loan (Khata)", ta: "கடன் (கணக்கு)" },
  subtitle: { en: "Who owes, right now", ta: "இப்போது யார் கடன்பட்டுள்ளனர்" },
  download: { en: "Download", ta: "பதிவிறக்கு" },
  loading: { en: "Loading…", ta: "ஏற்றுகிறது…" },
  empty: { en: "Nobody owes anything right now.", ta: "இப்போது யாரும் கடன்பட்டில்லை." },
  customer: { en: "Customer", ta: "வாடிக்கையாளர்" },
  balance: { en: "Balance", ta: "நிலுவை" },
  total: { en: "Total outstanding", ta: "மொத்த நிலுவை" },
};

/** Every customer currently owing money, itemized — requested 2026-09-04
 *  ("download the... Khata... with details as xlsv") alongside Sales and
 *  Expenses. Not day-grouped, unlike those two: a balance is a running
 *  total as of right now, not something tied to one particular day, so
 *  this is a single card/sheet rather than three days of them — and it's
 *  a live subscription (subscribeToOutstandingCustomers), so "now" really
 *  does mean now, not whenever the page happened to load. */
export function LoanSection() {
  const { language } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToOutstandingCustomers(
      (result) => {
        setError(null);
        setCustomers(result);
        setLoading(false);
      },
      (err) => {
        console.error("Customers subscription failed", err);
        setError(describeFirestoreError(err, language));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [language]);

  const totalOutstanding = customers.reduce((sum, c) => sum + c.balance, 0);

  return (
    <section className="report-section">
      <h2 className="report-section__title">{STRINGS.title[language]}</h2>

      {error ? (
        <p className="sales-report__error">{error}</p>
      ) : loading ? (
        <p className="sales-report__status">{STRINGS.loading[language]}</p>
      ) : customers.length === 0 ? (
        <p className="sales-report__status">{STRINGS.empty[language]}</p>
      ) : (
        <section className="day-card">
          <div className="day-card__header">
            <div className="day-card__heading">
              <h3 className="day-card__label">{STRINGS.total[language]}</h3>
              <p className="day-card__relative">{STRINGS.subtitle[language]}</p>
            </div>
            <p className="day-card__total">{formatCurrency(totalOutstanding)}</p>
            <button
              type="button"
              className="day-card__download"
              onClick={() => exportLoanXlsx(customers)}
            >
              {STRINGS.download[language]}
            </button>
          </div>
          <div className="day-card__table-wrap">
            <table className="day-card__table">
              <thead>
                <tr>
                  <th>{STRINGS.customer[language]}</th>
                  <th className="is-numeric">{STRINGS.balance[language]}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.customerId}>
                    <td>{customer.name}</td>
                    <td className="is-numeric">{formatCurrency(customer.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>{STRINGS.total[language]}</td>
                  <td className="is-numeric">{formatCurrency(totalOutstanding)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </section>
  );
}
