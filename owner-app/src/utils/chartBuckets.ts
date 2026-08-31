import type { Language, Order } from "@kumbakonam/shared";

export interface ChartBucket {
  label: string;
  total: number;
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, h) => {
  const period = h < 12 ? "am" : "pm";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}${period}`;
});

const DAY_LABELS: Record<Language, string[]> = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  ta: ["திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி", "ஞாயிறு"],
};

const WEEK_LABEL: Record<Language, string> = { en: "Week", ta: "வாரம்" };

/** A voided order is a mistake the owner cancelled, not a sale — never counted here. */
function excludeVoided(orders: Order[]): Order[] {
  return orders.filter((o) => o.status !== "voided");
}

/** Daily view — bucket by hour, trimmed to the range that actually has activity (avoids a mostly-empty 24-bar chart). */
export function bucketByHour(allOrders: Order[]): ChartBucket[] {
  const orders = excludeVoided(allOrders);
  const totals = new Array<number>(24).fill(0);
  for (const order of orders) {
    totals[order.createdAt.toDate().getHours()] += order.total;
  }

  const activeHours = totals.map((t, h) => (t > 0 ? h : -1)).filter((h) => h >= 0);
  if (activeHours.length === 0) return [];

  const first = Math.min(...activeHours);
  const last = Math.max(...activeHours);
  return Array.from({ length: last - first + 1 }, (_, i) => {
    const hour = first + i;
    return { label: HOUR_LABELS[hour], total: totals[hour] };
  });
}

/** Weekly view — bucket by day of week, Monday through Sunday, always all 7 shown for context. */
export function bucketByDayOfWeek(allOrders: Order[], language: Language = "en"): ChartBucket[] {
  const orders = excludeVoided(allOrders);
  const totals = new Array<number>(7).fill(0);
  for (const order of orders) {
    const dayIndex = (order.createdAt.toDate().getDay() + 6) % 7; // 0 = Monday
    totals[dayIndex] += order.total;
  }
  const labels = DAY_LABELS[language];
  return labels.map((label, i) => ({ label, total: totals[i] }));
}

/** Monthly view — bucket by week-of-month (days 1-7, 8-14, ...) so the chart stays ~4-5 bars instead of up to 31. */
export function bucketByWeekOfMonth(allOrders: Order[], monthStart: Date, language: Language = "en"): ChartBucket[] {
  const orders = excludeVoided(allOrders);
  const totals = new Map<number, number>();
  for (const order of orders) {
    const dayOfMonth = order.createdAt.toDate().getDate();
    const weekIndex = Math.floor((dayOfMonth - 1) / 7);
    totals.set(weekIndex, (totals.get(weekIndex) ?? 0) + order.total);
  }
  const weekCount = Math.floor((getDaysInMonth(monthStart) - 1) / 7) + 1;
  return Array.from({ length: weekCount }, (_, i) => ({
    label: `${WEEK_LABEL[language]} ${i + 1}`,
    total: totals.get(i) ?? 0,
  }));
}

function getDaysInMonth(monthStart: Date): number {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();
}

const RECENT_LABELS: Record<Language, string[]> = {
  en: ["Day before", "Yesterday", "Today"],
  ta: ["முந்தநாள்", "நேற்று", "இன்று"],
};

/** 3-day view — bucket by calendar day, oldest to newest, matching the
 *  window pruneOldOrders keeps (see orders.service.ts). `rangeStart` is
 *  the range's own start (local midnight, day before yesterday), so this
 *  never has to guess "today" independently of what the rest of the
 *  screen is already showing. */
export function bucketByRecentDay(allOrders: Order[], rangeStart: Date, language: Language = "en"): ChartBucket[] {
  const orders = excludeVoided(allOrders);
  const totals = [0, 0, 0];
  const startMidnight = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  for (const order of orders) {
    const d = order.createdAt.toDate();
    const orderMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayIndex = Math.round((orderMidnight.getTime() - startMidnight.getTime()) / 86400000);
    if (dayIndex >= 0 && dayIndex < 3) totals[dayIndex] += order.total;
  }
  return RECENT_LABELS[language].map((label, i) => ({ label, total: totals[i] }));
}
