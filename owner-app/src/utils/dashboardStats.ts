import type { Order } from "@kumbakonam/shared";

export interface TopItem {
  name: string;
  qty: number;
}

export interface DashboardStats {
  totalSales: number;
  orderCount: number;
  avgOrderValue: number;
  topItems: TopItem[];
}

const TOP_ITEMS_LIMIT = 5;

/** Client-side aggregation per Data Model §6 — acceptable at single-cafe scale. */
export function computeDashboardStats(orders: Order[]): DashboardStats {
  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = orders.length;
  const avgOrderValue = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;

  const qtyByName = new Map<string, number>();
  for (const order of orders) {
    for (const item of order.items) {
      qtyByName.set(item.name, (qtyByName.get(item.name) ?? 0) + item.qty);
    }
  }
  const topItems = Array.from(qtyByName.entries())
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, TOP_ITEMS_LIMIT);

  return { totalSales, orderCount, avgOrderValue, topItems };
}
