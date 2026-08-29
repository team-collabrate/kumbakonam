/**
 * Renders a bill to a 1-bit-friendly canvas.
 *
 * Thermal printers can only print Latin text from a single-byte codepage, so
 * Tamil (and a logo) can't go out as ESC/POS *text* at all. Instead the whole
 * receipt is drawn here — where the browser's own Tamil font shaping is
 * available — and printed as a raster bitmap (see escposRaster.ts).
 *
 * The same canvas backs the on-screen bill, so what the worker sees and what
 * the customer is handed cannot drift apart.
 */
import { CAFE_DETAILS, RECEIPT_LOGO_URL } from "./cafeDetails";
import type { BillInput } from "./receipt";

/** 80mm paper at 203 dpi: 576 printable dots. The printer rejects wider rasters. */
export const RECEIPT_WIDTH = 576;

const PAD = 8;
const CONTENT_LEFT = PAD;
const CONTENT_RIGHT = RECEIPT_WIDTH - PAD;
const CENTER = RECEIPT_WIDTH / 2;

/** Tamil first — the system Tamil face shapes the script correctly; the Latin
 *  fallbacks only ever handle digits and the few ASCII labels. */
const FONT_STACK = '"Noto Sans Tamil", "Latha", "Nirmala UI", system-ui, sans-serif';

const font = (size: number, weight: "normal" | "bold" = "normal") =>
  `${weight} ${size}px ${FONT_STACK}`;

/** Logo box, in printer dots. `scripts/prepare-receipt-logo.mjs` trims and
 *  resamples the source artwork to exactly this width, so the draw below is
 *  1:1 — resampling it a second time here would soften the fine temple
 *  linework right before the print path crushes it to 1-bit. Height is the
 *  ceiling for a taller mark, not a target.
 *
 *  Every dot of logo height costs 72 bytes over the air and a dot of paper,
 *  so this is a print-speed setting as much as a design one. Regenerate the
 *  PNG at the same width after changing it. */
const LOGO_MAX_W = 320;
const LOGO_MAX_H = 180;

/** Column x-positions, right-aligned to mirror the reference receipt. */
const COL_QTY_RIGHT = 366;
const COL_PRICE_RIGHT = 462;
const COL_AMOUNT_RIGHT = CONTENT_RIGHT;
const COL_ITEM_MAX = 300;

/** Every label on the paper is Tamil — the receipt is for the customer, so it
 *  reads in one language regardless of the app's current UI language. */
const L = {
  item: "பொருள்",
  qty: "அளவு",
  price: "விலை",
  amount: "தொகை",
  date: "தேதி",
  billNo: "பில் எண்",
  subtotal: "கூட்டுத்தொகை",
  total: "மொத்தம்",
  payment: "பணம்",
  phone: "தொலைபேசி",
} as const;

const money = (n: number) => n.toFixed(2);

async function loadLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // no logo file — print without it
    img.src = RECEIPT_LOGO_URL;
  });
}

/** Greedy wrap so long item names spill to a second line instead of colliding
 *  with the QTY column. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function dashedRule(ctx: CanvasRenderingContext2D, y: number) {
  ctx.save();
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(CONTENT_LEFT, y);
  ctx.lineTo(CONTENT_RIGHT, y);
  ctx.stroke();
  ctx.restore();
}

function formatDateTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  let h = date.getHours();
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()} ${p(h)}:${p(
    date.getMinutes(),
  )}:${p(date.getSeconds())} ${period}`;
}

export async function renderReceiptCanvas(bill: BillInput): Promise<HTMLCanvasElement> {
  // Tamil glyphs measure as tofu until the face is actually loaded, which
  // would throw off every wrap and right-alignment on the receipt.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* proceed with whatever is loaded */
    }
  }

  const logo = await loadLogo();

  // Two passes over an identical draw list: the first only advances `y` to
  // learn the height, the second draws for real once the canvas is sized.
  const measure = document.createElement("canvas").getContext("2d")!;
  const height = paint(measure, bill, logo, true);

  const canvas = document.createElement("canvas");
  canvas.width = RECEIPT_WIDTH;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  paint(ctx, bill, logo, false);

  return canvas;
}

function paint(
  ctx: CanvasRenderingContext2D,
  bill: BillInput,
  logo: HTMLImageElement | null,
  measureOnly: boolean,
): number {
  const draw = (fn: () => void) => {
    if (!measureOnly) fn();
  };

  let y = PAD;

  // --- Logo ---------------------------------------------------------------
  if (logo && logo.width > 0) {
    const scale = Math.min(LOGO_MAX_W / logo.width, LOGO_MAX_H / logo.height, 1);
    const w = logo.width * scale;
    const h = logo.height * scale;
    draw(() => ctx.drawImage(logo, CENTER - w / 2, y, w, h));
    y += h + 12;
  }

  // --- Shop identity ------------------------------------------------------
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.font = font(46, "bold");
  y += 46;
  draw(() => ctx.fillText(CAFE_DETAILS.name, CENTER, y));

  if (CAFE_DETAILS.subtitle) {
    ctx.font = font(28);
    y += 36;
    draw(() => ctx.fillText(CAFE_DETAILS.subtitle, CENTER, y));
  }

  if (CAFE_DETAILS.phone) {
    ctx.font = font(24);
    y += 32;
    draw(() => ctx.fillText(`${L.phone}: ${CAFE_DETAILS.phone}`, CENTER, y));
  }

  // --- Order meta ---------------------------------------------------------
  y += 14;
  ctx.textAlign = "left";
  ctx.font = font(24);
  y += 26;
  draw(() => ctx.fillText(`${L.date}: ${formatDateTime(bill.createdAt)}`, CONTENT_LEFT, y));
  y += 30;
  draw(() => ctx.fillText(`${L.billNo}: ${bill.billNo}`, CONTENT_LEFT, y));

  y += 14;
  draw(() => dashedRule(ctx, y));

  // --- Column headers -----------------------------------------------------
  ctx.font = font(24, "bold");
  y += 30;
  draw(() => {
    ctx.textAlign = "left";
    ctx.fillText(L.item, CONTENT_LEFT, y);
    ctx.textAlign = "right";
    ctx.fillText(L.qty, COL_QTY_RIGHT, y);
    ctx.fillText(L.price, COL_PRICE_RIGHT, y);
    ctx.fillText(L.amount, COL_AMOUNT_RIGHT, y);
  });

  y += 12;
  draw(() => dashedRule(ctx, y));
  y += 10;

  // --- Line items ---------------------------------------------------------
  ctx.font = font(26);
  for (const item of bill.items) {
    ctx.textAlign = "left";
    const lines = wrap(ctx, item.name, COL_ITEM_MAX);
    y += 30;
    const firstLineY = y;
    draw(() => ctx.fillText(lines[0], CONTENT_LEFT, firstLineY));

    // Figures sit on the item's first line; extra name lines hang below.
    draw(() => {
      ctx.textAlign = "right";
      ctx.fillText(String(item.qty), COL_QTY_RIGHT, firstLineY);
      ctx.fillText(money(item.price), COL_PRICE_RIGHT, firstLineY);
      ctx.fillText(money(item.price * item.qty), COL_AMOUNT_RIGHT, firstLineY);
    });

    for (const extra of lines.slice(1)) {
      y += 28;
      const lineY = y;
      draw(() => {
        ctx.textAlign = "left";
        ctx.fillText(extra, CONTENT_LEFT, lineY);
      });
    }

    if (item.note) {
      ctx.font = font(22);
      y += 26;
      const noteY = y;
      draw(() => {
        ctx.textAlign = "left";
        ctx.fillText(`  * ${item.note}`, CONTENT_LEFT, noteY);
      });
      ctx.font = font(26);
    }
  }

  y += 16;
  draw(() => dashedRule(ctx, y));

  // --- Totals -------------------------------------------------------------
  ctx.font = font(26);
  y += 34;
  draw(() => {
    ctx.textAlign = "left";
    ctx.fillText(`${L.subtotal}:`, CONTENT_LEFT, y);
    ctx.textAlign = "right";
    ctx.fillText(money(bill.subtotal), COL_AMOUNT_RIGHT, y);
  });

  y += 46;
  draw(() => {
    ctx.font = font(40, "bold");
    ctx.textAlign = "left";
    ctx.fillText(`${L.total} :`, CONTENT_LEFT, y);
    ctx.textAlign = "right";
    // The rupee sign renders from the browser font here — on a raster print
    // there's no codepage to fall foul of.
    ctx.fillText(`₹ ${money(bill.total)}`, COL_AMOUNT_RIGHT, y);
  });

  ctx.font = font(24);
  y += 34;
  draw(() => {
    ctx.textAlign = "left";
    ctx.fillText(`${L.payment}: ${bill.paymentLabel}`, CONTENT_LEFT, y);
    ctx.textAlign = "right";
    ctx.fillText(bill.workerName, COL_AMOUNT_RIGHT, y);
  });

  // Split bills get the two figures on their own line — the row above is
  // already shared with the right-aligned worker name.
  if (bill.paymentBreakdown) {
    y += 28;
    const breakdownY = y;
    draw(() => {
      ctx.textAlign = "left";
      ctx.fillText(`  ${bill.paymentBreakdown}`, CONTENT_LEFT, breakdownY);
    });
  }

  // --- Footer -------------------------------------------------------------
  if (CAFE_DETAILS.thanks) {
    ctx.font = font(32, "bold");
    y += 48;
    draw(() => {
      ctx.textAlign = "center";
      ctx.fillText(CAFE_DETAILS.thanks, CENTER, y);
    });
  }

  if (CAFE_DETAILS.footer) {
    ctx.font = font(22);
    y += 32;
    draw(() => {
      ctx.textAlign = "center";
      ctx.fillText(CAFE_DETAILS.footer, CENTER, y);
    });
  }

  // Blank tail so the tear-off edge clears the last line. Kept short because
  // the cut sequence already feeds three lines past this point — anything
  // more here is paper and transfer time spent printing nothing.
  y += 16;
  return Math.ceil(y);
}
