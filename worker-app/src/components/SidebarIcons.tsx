/**
 * The sidebar's six icons, hand-drawn rather than emoji.
 *
 * Emoji glyphs render differently per platform/font (the same worry
 * ProductIcon was built to avoid for menu items), can't take a stroke
 * colour, and don't share a weight with each other — a 🌐 next to a 🖨
 * next to a ⏻ are three different visual styles glued together, not one
 * icon set. These are one grid (24x24), one stroke width, one line style,
 * so the six read as a family regardless of platform.
 */

const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Language toggle. */
export function LanguageIcon() {
  return (
    <svg {...BASE}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.7 12h16.6" />
      <path d="M12 3.5c2.3 2.3 3.6 5.3 3.6 8.5s-1.3 6.2-3.6 8.5c-2.3-2.3-3.6-5.3-3.6-8.5s1.3-6.2 3.6-8.5z" />
    </svg>
  );
}

/** Credit book / khata — an open book. */
export function KhataIcon() {
  return (
    <svg {...BASE}>
      <path d="M12 6.2c-1.3-1.2-3-1.7-6.2-1.7-.7 0-1.3.6-1.3 1.3v11.6c0 .7.6 1.2 1.3 1.1 2.9-.2 4.7.3 6.2 1.5" />
      <path d="M12 6.2c1.3-1.2 3-1.7 6.2-1.7.7 0 1.3.6 1.3 1.3v11.6c0 .7-.6 1.2-1.3 1.1-2.9-.2-4.7.3-6.2 1.5V6.2z" />
    </svg>
  );
}

/** Record spending — a receipt, torn along the bottom. */
export function ReceiptIcon() {
  return (
    <svg {...BASE}>
      <path d="M6 3h12v17.3l-1.7-1.1-1.7 1.1-1.6-1.1-1.7 1.1-1.6-1.1-1.7 1.1L6 19.3V3z" />
      <path d="M9 8.2h6M9 12h6" />
    </svg>
  );
}

/** Active worker — who's on shift, shown on the printed bill. */
export function WorkerIcon() {
  return (
    <svg {...BASE}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.2 19.5c0-3.7 3-6 6.8-6s6.8 2.3 6.8 6" />
    </svg>
  );
}

/** Printer setup. */
export function PrinterIcon() {
  return (
    <svg {...BASE}>
      <path d="M6.5 9V3.8h11V9" />
      <rect x="4" y="9" width="16" height="7" rx="1.6" />
      <path d="M7.5 14.5h9v6h-9z" />
    </svg>
  );
}

/** Log out — a door left open with the way out through it, closer to what
 *  the action means (re-enter your PIN to come back) than a power symbol. */
export function LogoutIcon() {
  return (
    <svg {...BASE}>
      <path d="M10 4.5H6a1.3 1.3 0 0 0-1.3 1.3v12.4A1.3 1.3 0 0 0 6 19.5h4" />
      <path d="M14.7 8.3 19 12l-4.3 3.7" />
      <path d="M19 12H9.5" />
    </svg>
  );
}
