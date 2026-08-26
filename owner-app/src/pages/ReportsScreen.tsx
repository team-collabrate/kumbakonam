import { useMemo, useState } from "react";
import { useLanguage } from "@kumbakonam/shared";
import { getRange, type RangeMode } from "../utils/dateRange";
import { useOrdersInRange } from "../hooks/useOrdersInRange";
import { bucketByDayOfWeek, bucketByHour, bucketByWeekOfMonth } from "../utils/chartBuckets";
import { RangeSegmentedControl } from "../components/RangeSegmentedControl";
import { SalesChart } from "../components/SalesChart";
import { OrderHistoryRow } from "../components/OrderHistoryRow";
import "./ReportsScreen.css";

const STRINGS = {
  title: { en: "Reports", ta: "அறிக்கைகள்" },
  orderHistory: { en: "Order History", ta: "ஆர்டர் வரலாறு" },
  loading: { en: "Loading…", ta: "ஏற்றுகிறது…" },
  empty: { en: "No orders in this period.", ta: "இந்தக் காலத்தில் ஆர்டர்கள் இல்லை." },
};

export function ReportsScreen() {
  const { language } = useLanguage();
  const [mode, setMode] = useState<RangeMode>("daily");
  const range = useMemo(() => getRange(mode), [mode]);
  const { orders, loading, error } = useOrdersInRange(range);

  const chartData = useMemo(() => {
    if (mode === "daily") return bucketByHour(orders);
    if (mode === "weekly") return bucketByDayOfWeek(orders, language);
    return bucketByWeekOfMonth(orders, range.start, language);
  }, [mode, orders, range.start, language]);

  return (
    <div className="reports-screen">
      <h1 className="reports-screen__title">{STRINGS.title[language]}</h1>
      <RangeSegmentedControl value={mode} onChange={setMode} />

      {error ? (
        <p className="reports-screen__error">{error}</p>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
