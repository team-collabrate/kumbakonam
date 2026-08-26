import type { PaymentMethod } from "@kumbakonam/shared";

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** 32 columns fits common 58mm thermal paper (the cheapest, most common printer size). */
const PAPER_WIDTH = 32;

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
};

export interface BillLine {
  /** Canonical English/Tanglish name — this is what actually gets printed (see textLine() below). */
  name: string;
  /** Tamil display name, ignored here — kept only so BillView can show it on-screen. */
  nameTa?: string;
  qty: number;
  price: number;
  note?: string;
}

export interface BillInput {
  orderId: string;
  cafeName: string;
  items: BillLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  workerName: string;
  createdAt: Date;
}

// --- low-level ESC/POS byte commands -------------------------------------

const bytes = (...values: number[]) => new Uint8Array(values);

const cmd = {
  init: () => bytes(ESC, 0x40),
  boldOn: () => bytes(ESC, 0x45, 1),
  boldOff: () => bytes(ESC, 0x45, 0),
  alignLeft: () => bytes(ESC, 0x61, 0),
  alignCenter: () => bytes(ESC, 0x61, 1),
  doubleSizeOn: () => bytes(GS, 0x21, 0x11),
  doubleSizeOff: () => bytes(GS, 0x21, 0x00),
  cut: () => bytes(GS, 0x56, 0x01),
};

/**
 * Most cheap ESC/POS printers only support a single-byte codepage
 * (CP437/CP1252-ish), not UTF-8 — so non-ASCII characters (₹ included) are
 * replaced with "?" rather than sent as multi-byte UTF-8, which would print
 * as garbage. Bill amounts use "Rs" instead of "₹" for this reason.
 */
function textLine(text: string): Uint8Array {
  const codes = Array.from(text).map((ch) => {
    const code = ch.codePointAt(0) ?? 0x3f;
    return code < 128 ? code : 0x3f;
  });
  codes.push(LF);
  return new Uint8Array(codes);
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

// --- line layout helpers ---------------------------------------------------

function divider(): string {
  return "-".repeat(PAPER_WIDTH);
}

/** Two-column line: label on the left, value right-aligned, truncating the label if needed. */
function twoCol(left: string, right: string): string {
  const space = PAPER_WIDTH - left.length - right.length;
  if (space >= 1) return left + " ".repeat(space) + right;
  const maxLeft = Math.max(0, PAPER_WIDTH - right.length - 1);
  return left.slice(0, maxLeft) + " " + right;
}

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function shortOrderRef(orderId: string): string {
  return `#${orderId.slice(-6)}`;
}

/** Builds the full ESC/POS byte stream for a bill — ready to send via Web USB. */
export function buildBillBytes(input: BillInput): Uint8Array {
  const lines: Uint8Array[] = [cmd.init()];

  lines.push(cmd.alignCenter(), cmd.boldOn(), cmd.doubleSizeOn());
  lines.push(textLine(input.cafeName));
  lines.push(cmd.doubleSizeOff(), cmd.boldOff());
  lines.push(cmd.alignLeft());
  lines.push(textLine(divider()));
  lines.push(textLine(twoCol(formatDate(input.createdAt), shortOrderRef(input.orderId))));
  lines.push(textLine(`Served by: ${input.workerName}`));
  lines.push(textLine(divider()));

  for (const item of input.items) {
    const label = `${item.qty}x ${item.name}`;
    const value = String(item.price * item.qty);
    lines.push(textLine(twoCol(label, value)));
    if (item.note) {
      lines.push(textLine(`   note: ${item.note}`));
    }
  }

  lines.push(textLine(divider()));
  lines.push(textLine(twoCol("Subtotal", `Rs ${input.subtotal}`)));
  if (input.discount > 0) {
    lines.push(textLine(twoCol("Discount", `-Rs ${input.discount}`)));
  }
  lines.push(cmd.boldOn());
  lines.push(textLine(twoCol("TOTAL", `Rs ${input.total}`)));
  lines.push(cmd.boldOff());
  lines.push(textLine(`Payment: ${PAYMENT_LABEL[input.paymentMethod]}`));
  lines.push(textLine(divider()));

  lines.push(cmd.alignCenter());
  lines.push(textLine("Thank you! Visit again"));
  lines.push(cmd.alignLeft());

  lines.push(textLine(""));
  lines.push(textLine(""));
  lines.push(cmd.cut());

  return concat(lines);
}
