import type { DaySalesReport } from "./itemSalesReport";

/** One sheet per day (named by its date, e.g. "2026-09-03"), each listing
 *  every item sold that day with qty and amount, a blank row, then the
 *  day's own total — matches what the owner asked for: "what are all items
 *  has been sold and what their count and the amount", per day.
 *
 *  Item ID and Rate are in the export for audit purposes (requested
 *  2026-09-03): two rows can share a display name (a renamed/re-added menu
 *  item, or a bulk/wholesale rate billed under the same name) while being
 *  genuinely different sales — the Item ID is the actual stable identity,
 *  and "Rate (avg)" flags when even one Item ID itself sold at more than
 *  one price in the window, so a number here is never silently averaging
 *  over something that looks like — but isn't — one fixed price.
 *
 *  xlsx is a ~700KB library — dynamically imported here rather than at the
 *  top of the module, so a viewer who never presses Export never downloads
 *  it (this page is meant to be opened on a phone over whatever connection
 *  is around). */
export async function exportItemSalesXlsx(days: DaySalesReport[], filenamePrefix: string): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  for (const day of days) {
    const rows: Array<Record<string, string | number>> = day.items.map((item) => ({
      Item: item.name,
      "Item ID": item.itemId,
      Qty: item.qty,
      "Rate (₹)": item.rateVaries ? `${item.rate.toFixed(2)} (avg)` : item.rate,
      "Amount (₹)": item.amount,
    }));
    const totalQty = day.items.reduce((sum, item) => sum + item.qty, 0);
    rows.push({ Item: "", "Item ID": "", Qty: "", "Rate (₹)": "", "Amount (₹)": "" });
    // Two separate rows, not one blended one — "Qty" means item quantity
    // everywhere else on this sheet; folding order count into that same
    // column here (as an earlier version of this export did) reads as if
    // 402 orders and 402 items sold were the same number, which they
    // usually aren't.
    rows.push({ Item: "Orders", "Item ID": "", Qty: day.orderCount, "Rate (₹)": "", "Amount (₹)": "" });
    rows.push({ Item: "TOTAL", "Item ID": "", Qty: totalQty, "Rate (₹)": "", "Amount (₹)": day.totalSales });

    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 32 }, { wch: 24 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
    // Sheet names can't exceed 31 chars or contain []:*?/\ — the YYYY-MM-DD
    // key is already safe and unique, so it doubles as the sheet name.
    XLSX.utils.book_append_sheet(workbook, sheet, day.key);
  }

  // A single-day download (the per-day "Download" button, requested
  // 2026-09-04) names the file after the day it actually covers, not the
  // day it happened to be downloaded on — "kumbakonam-sales-2026-09-03.xlsx"
  // stays correct even opened a week later. Only a multi-day export (kept
  // for reuse, nothing currently calls it that way) falls back to today's
  // date, since there's no single day to name it after.
  const stamp = days.length === 1 ? days[0].key : new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filenamePrefix}-${stamp}.xlsx`);
}
