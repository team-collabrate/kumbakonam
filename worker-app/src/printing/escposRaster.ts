/**
 * Canvas -> ESC/POS raster bitmap (GS v 0).
 *
 * Printing the receipt as dots rather than characters is what allows Tamil and
 * a logo on the paper: the printer never sees text, only ink positions, so its
 * single-byte codepage is irrelevant.
 */

const ESC = 0x1b;
const GS = 0x1d;

/** Luminance at/above this prints as blank paper. Thermal output is 1-bit —
 *  there is no grey, so anti-aliased glyph edges must fall to one side. */
const INK_THRESHOLD = 160;

/** Rows per GS v 0 command. Cheap printers hold only a few KB of image at a
 *  time; banding keeps each command well inside that. */
const BAND_ROWS = 128;

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

/** Packs the canvas into 1 bit per dot, MSB-first, which is the layout GS v 0 expects. */
function packRaster(canvas: HTMLCanvasElement): { data: Uint8Array; widthBytes: number; height: number } {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  const { width, height } = canvas;
  const { data: pixels } = ctx.getImageData(0, 0, width, height);
  const widthBytes = Math.ceil(width / 8);
  const data = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = pixels[i + 3];
      // Treat transparent as paper, not as ink.
      const luminance =
        alpha === 0
          ? 255
          : 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (luminance < INK_THRESHOLD) {
        data[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  return { data, widthBytes, height };
}

export interface RasterReceiptOptions {
  /** Feed + full cut after printing. Printers without a cutter ignore it. */
  cut?: boolean;
}

/** Builds the full byte stream for a receipt image, ready for the transport. */
export function buildRasterReceipt(
  canvas: HTMLCanvasElement,
  options: RasterReceiptOptions = {},
): Uint8Array {
  const { cut = true } = options;
  const { data, widthBytes, height } = packRaster(canvas);

  const chunks: Uint8Array[] = [
    new Uint8Array([ESC, 0x40]), // initialise
    new Uint8Array([ESC, 0x61, 0x01]), // centre the image block
  ];

  for (let row = 0; row < height; row += BAND_ROWS) {
    const rows = Math.min(BAND_ROWS, height - row);
    chunks.push(
      new Uint8Array([
        GS,
        0x76,
        0x30,
        0x00, // mode 0: normal density
        widthBytes & 0xff,
        (widthBytes >> 8) & 0xff,
        rows & 0xff,
        (rows >> 8) & 0xff,
      ]),
    );
    chunks.push(data.subarray(row * widthBytes, (row + rows) * widthBytes));
  }

  chunks.push(new Uint8Array([ESC, 0x61, 0x00])); // back to left align
  if (cut) {
    chunks.push(new Uint8Array([0x0a, 0x0a, 0x0a])); // feed clear of the cutter
    chunks.push(new Uint8Array([GS, 0x56, 0x00]));
  }

  return concat(chunks);
}
