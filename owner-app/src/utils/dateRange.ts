export type RangeMode = "daily" | "weekly" | "monthly";

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Fixed periods per TDD §7 ("today / this week / this month"), not a rolling
 * trend window.
 *
 * `end` is the START of the *next* day/week/month, not "now" — the Owner
 * dashboard subscribes to this range with `onSnapshot` (TDD §7), and a
 * Firestore range query's bounds are fixed at query time. If `end` were
 * "now", an order created a minute later would have `createdAt > end` and
 * would silently never appear in the live feed. Using the period's true
 * end keeps the query — and the realtime subscription — valid for the
 * rest of the period.
 */
export function getRange(mode: RangeMode, now: Date = new Date()): DateRange {
  if (mode === "daily") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return { start, end };
  }

  if (mode === "weekly") {
    const dayIndex = (now.getDay() + 6) % 7; // days since Monday (0 = Monday)
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayIndex);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    return { start, end };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}
