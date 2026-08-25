import { useMemo, useState } from "react";
import { getRange, type RangeMode } from "../utils/dateRange";
import { useOrdersInRange } from "../hooks/useOrdersInRange";
import { bucketByDayOfWeek, bucketByHour, bucketByWeekOfMonth } from "../utils/chartBuckets";
import { RangeSegmentedControl } from "../components/RangeSegmentedControl";
import { SalesChart } from "../components/SalesChart";
import { OrderHistoryRow } from "../components/OrderHistoryRow";
import "./ReportsScreen.css";

export function ReportsScreen() {
  const [mode, setMode] = useState<RangeMode>("daily");
  const range = useMemo(() => getRange(mode), [mode]);
  const { orders, loading } = useOrdersInRange(range);

  const chartData = useMemo(() => {
    if (mode === "daily") return bucketByHour(orders);
    if (mode === "weekly") return bucketByDayOfWeek(orders);
    return bucketByWeekOfMonth(orders, range.start);
  }, [mode, orders, range.start]);

  return (
    <div className="reports-screen">
      <h1 className="reports-screen__title">Reports</h1>
      <RangeSegmentedControl value={mode} onChange={setMode} />

      <section className="reports-screen__chart">
        <SalesChart data={chartData} />
      </section>

      <section className="reports-screen__history">
        <h2 className="reports-screen__history-title">Order History</h2>
        {loading ? (
          <p className="reports-screen__status">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="reports-screen__status">No orders in this period.</p>
        ) : (
          orders.map((order) => <OrderHistoryRow key={order.orderId} order={order} />)
        )}
      </section>
    </div>
  );
}
