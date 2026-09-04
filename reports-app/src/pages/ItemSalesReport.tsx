import { LanguageToggle, useLanguage } from "@kumbakonam/shared";
import { SalesSection } from "../components/SalesSection";
import { ExpensesSection } from "../components/ExpensesSection";
import { LoanSection } from "../components/LoanSection";
import "./ItemSalesReport.css";

const STRINGS = {
  title: { en: "Reports", ta: "அறிக்கைகள்" },
  subtitle: {
    en: "Sales, Expenses and Loan (Khata) — last 3 days, downloadable as .xlsx",
    ta: "விற்பனை, செலவுகள் மற்றும் கடன் (கணக்கு) — கடந்த 3 நாட்கள், .xlsx ஆக பதிவிறக்கம் செய்யலாம்",
  },
  logout: { en: "Log out", ta: "வெளியேறு" },
};

export interface ItemSalesReportProps {
  onLogout: () => void;
}

/** Standalone page (its own Firebase Hosting site — kumbakonam-reports)
 *  now covering three separate downloadable reports (requested 2026-09-04
 *  after Sales alone shipped: "download the Spending and Khata in the
 *  reports page... with details"), each its own section with its own data
 *  subscription and its own per-day (or, for Loan, single) Download
 *  button — see SalesSection/ExpensesSection/LoanSection. Gated by the
 *  same owner PIN login as owner-app; modeled loosely on the
 *  dairy-reports.vercel.app reference the owner first pointed at
 *  (date-grouped cards + an Export button), rebuilt for this app's own
 *  data rather than that app's vendor-bill data. */
export function ItemSalesReport({ onLogout }: ItemSalesReportProps) {
  const { language } = useLanguage();

  return (
    <div className="sales-report">
      <header className="sales-report__header">
        <div>
          <h1 className="sales-report__title">{STRINGS.title[language]}</h1>
          <p className="sales-report__subtitle">{STRINGS.subtitle[language]}</p>
        </div>
        <div className="sales-report__actions">
          <LanguageToggle />
          <button type="button" className="sales-report__logout" onClick={onLogout}>
            {STRINGS.logout[language]}
          </button>
        </div>
      </header>

      <SalesSection />
      <ExpensesSection />
      <LoanSection />
    </div>
  );
}
