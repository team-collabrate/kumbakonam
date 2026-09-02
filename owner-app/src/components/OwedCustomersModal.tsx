import { useState } from "react";
import { formatCurrency, useLanguage, useSession, type Customer } from "@kumbakonam/shared";
import { RecordPaymentModal } from "./RecordPaymentModal";
import "./OwedCustomersModal.css";

const STRINGS = {
  title: { en: "Owed to you", ta: "வர வேண்டியது" },
  total: { en: "Total outstanding", ta: "மொத்த நிலுவை" },
  nobody: { en: "Everyone has settled.", ta: "அனைவரும் கடனை அடைத்துவிட்டனர்." },
  collect: { en: "Collect", ta: "பணம் பெறு" },
  close: { en: "Close", ta: "மூடு" },
};

export interface OwedCustomersModalProps {
  customers: Customer[];
  totalOutstanding: number;
  onClose: () => void;
}

/** Pop-up detail behind the Dashboard's "Owed to you" card — who owes what,
 *  biggest first (customers.outstanding already comes sorted that way), with
 *  the same Collect flow ReportsScreen offers rather than a second one. */
export function OwedCustomersModal({ customers, totalOutstanding, onClose }: OwedCustomersModalProps) {
  const { language } = useLanguage();
  const { sessionUser } = useSession();
  const [collectingFrom, setCollectingFrom] = useState<Customer | null>(null);

  return (
    <>
      <div className="owed-modal__backdrop" role="dialog" aria-modal="true" aria-label={STRINGS.title[language]}>
        <div className="owed-modal">
          <div className="owed-modal__header">
            <h2 className="owed-modal__title">{STRINGS.title[language]}</h2>
            <p className="owed-modal__total">{formatCurrency(totalOutstanding)}</p>
          </div>

          {customers.length === 0 ? (
            <p className="owed-modal__empty">{STRINGS.nobody[language]}</p>
          ) : (
            <ul className="owed-modal__list">
              {customers.map((customer) => (
                <li key={customer.customerId}>
                  <span className="owed-modal__name">{customer.name}</span>
                  <span className="owed-modal__balance">{formatCurrency(customer.balance)}</span>
                  {sessionUser && (
                    <button type="button" className="owed-modal__collect" onClick={() => setCollectingFrom(customer)}>
                      {STRINGS.collect[language]}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <button type="button" className="owed-modal__close" onClick={onClose}>
            {STRINGS.close[language]}
          </button>
        </div>
      </div>

      {collectingFrom && sessionUser && (
        <RecordPaymentModal
          customer={collectingFrom}
          ownerId={sessionUser.userId}
          onClose={() => setCollectingFrom(null)}
        />
      )}
    </>
  );
}
