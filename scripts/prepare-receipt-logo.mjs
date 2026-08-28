/**
 * Prepares a source logo for printing at the top of the receipt.
 *
 * A camera-ready logo is the wrong shape for a till roll: it arrives large,
 * in colour, and floating in a sea of whitespace. Dropped in as-is, the
 * receipt renderer scales the whole canvas — whitespace included — down to
 * fit its box, so the artwork itself ends up a smudge in the middle of an
 * empty rectangle.
 *
 * This trims to the ink, resamples to the exact width the receipt draws at
 * (so the canvas never resamples it again), and writes an 8-bit greyscale
 * PNG. Greyscale rather than pre-thresholded 1-bit: the print path already
 * thresholds when it packs the raster, and keeping the soft edges makes the
 * on-screen bill look like paper instead of a fax.
 *
 * Usage:
 *   node scripts/prepare-receipt-logo.mjs <source.png> [targetWidth]
 *
 * Writes worker-app/public/receipt-logo.png.
 *
 * Deliberately dependency-free — decoding and encoding PNG by hand is a few
 * dozen lines with node:zlib, and this repo has no image toolchain to lean on.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { inflateSync, deflateSync } from "node:zlib";

/** 80mm paper is 576 printable dots; this leaves a clear margin either side. */
const DEFAULT_TARGET_WIDTH = 480;

/** Anything darker than this counts as ink when finding the crop box. Set
 *  well below mid-grey so scanner speckle and off-white paper don't widen
 *  the box back out to the full frame. */
const INK_CUTOFF = 180;

/** Breathing room around the trimmed artwork, as a fraction of its width. */
const PAD_RATIO = 0.02;

// ── PNG decode ────────────────────────────────────────────────────────────

function readChunks(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("Not a PNG file.");
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    chunks.push({ type, data: buf.subarray(off + 8, off + 8 + len) });
    off += len + 12; // length + type + data + crc
  }
  return chunks;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Returns { width, height, gray } — one luminance byte per pixel. */
function decodeToGray(buf) {
  const chunks = readChunks(buf);
  const ihdr = chunks.find((c) => c.type === "IHDR");
  if (!ihdr) throw new Error("PNG has no IHDR.");

  const width = ihdr.data.readUInt32BE(0);
  const height = ihdr.data.readUInt32BE(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];
  const interlace = ihdr.data[12];

  if (bitDepth !== 8) throw new Error(`Only 8-bit PNGs are handled (got ${bitDepth}-bit).`);
  if (interlace !== 0) throw new Error("Interlaced PNGs are not handled. Re-save without interlacing.");

  const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };
  const channels = CHANNELS[colorType];
  if (!channels) throw new Error(`Unsupported colour type ${colorType}. Use greyscale or RGB.`);

  const idat = Buffer.concat(chunks.filter((c) => c.type === "IDAT").map((c) => c.data));
  const raw = inflateSync(idat);

  const stride = width * channels;
  const out = new Uint8Array(raw.length - height); // drop the per-scanline filter byte

  // Unfilter in place, scanline by scanline, against the previous output row.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    const prev = dst - stride;

    for (let x = 0; x < stride; x++) {
      const value = raw[src + x];
      const a = x >= channels ? out[dst + x - channels] : 0; // left
      const b = y > 0 ? out[prev + x] : 0; // above
      const c = y > 0 && x >= channels ? out[prev + x - channels] : 0; // above-left

      let restored;
      switch (filter) {
        case 0: restored = value; break;
        case 1: restored = value + a; break;
        case 2: restored = value + b; break;
        case 3: restored = value + ((a + b) >> 1); break;
        case 4: restored = value + paeth(a, b, c); break;
        default: throw new Error(`Unknown scanline filter ${filter} on row ${y}.`);
      }
      out[dst + x] = restored & 0xff;
    }
  }

  // Flatten to luminance. Alpha composites over white, because the receipt
  // is white paper — a transparent background must read as blank, not black.
  const gray = new Uint8Array(width * height);
  for (let i = 0, p = 0; p < gray.length; p++, i += channels) {
    let lum;
    let alpha = 255;
    if (channels === 1) {
      lum = out[i];
    } else if (channels === 2) {
      lum = out[i];
      alpha = out[i + 1];
    } else {
      lum = 0.299 * out[i] + 0.587 * out[i + 1] + 0.114 * out[i + 2];
      if (channels === 4) alpha = out[i + 3];
    }
    gray[p] = Math.round(alpha === 255 ? lum : lum * (alpha / 255) + 255 * (1 - alpha / 255));
  }

  return { width, height, gray };
}

// ── Crop, resample ────────────────────────────────────────────────────────

function inkBounds(gray, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (gray[y * width + x] < INK_CUTOFF) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("No ink found — the image looks blank at this cutoff.");
  return { minX, minY, maxX, maxY };
}

/** Box-filter resample. Averaging every source pixel that lands in a
 *  destination cell keeps hairlines visible; nearest-neighbour would drop
 *  whole rows of the temple's tiers. */
function resample(src, srcW, srcH, sx, sy, cropW, cropH, dstW, dstH) {
  const dst = new Uint8Array(dstW * dstH);
  const xRatio = cropW / dstW;
  const yRatio = cropH / dstH;

  for (let y = 0; y < dstH; y++) {
    const y0 = sy + Math.floor(y * yRatio);
    const y1 = Math.max(y0 + 1, sy + Math.floor((y + 1) * yRatio));
    for (let x = 0; x < dstW; x++) {
      const x0 = sx + Math.floor(x * xRatio);
      const x1 = Math.max(x0 + 1, sx + Math.floor((x + 1) * xRatio));
      let sum = 0;
      let count = 0;
      for (let yy = y0; yy < y1 && yy < srcH; yy++) {
        for (let xx = x0; xx < x1 && xx < srcW; xx++) {
          sum += src[yy * srcW + xx];
          count++;
        }
      }
      dst[y * dstW + x] = count ? Math.round(sum / count) : 255;
    }
  }
  return dst;
}

// ── PNG encode ────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodeGrayPng(gray, width, height) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 0; // colour type: greyscale
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // no interlace

  // Filter type 0 on every scanline; the artwork is flat line art, so the
  // adaptive filters buy almost nothing over deflate's own matching.
  const raw = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (width + 1)] = 0;
    Buffer.from(gray.subarray(y * width, (y + 1) * width)).copy(raw, y * (width + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Main ──────────────────────────────────────────────────────────────────

const [source, widthArg] = process.argv.slice(2);
if (!source) {
  console.error("Usage: node scripts/prepare-receipt-logo.mjs <source.png> [targetWidth]");
  process.exit(1);
}
const targetWidth = Number(widthArg) || DEFAULT_TARGET_WIDTH;

const input = readFileSync(source);
const { width, height, gray } = decodeToGray(input);
console.log(`source      ${width}x${height}, ${(input.length / 1024 / 1024).toFixed(2)} MB`);

const { minX, minY, maxX, maxY } = inkBounds(gray, width, height);
const pad = Math.round((maxX - minX + 1) * PAD_RATIO);
const sx = Math.max(0, minX - pad);
const sy = Math.max(0, minY - pad);
const ex = Math.min(width - 1, maxX + pad);
const ey = Math.min(height - 1, maxY + pad);
const cropW = ex - sx + 1;
const cropH = ey - sy + 1;

console.log(`ink bounds  x ${minX}-${maxX}, y ${minY}-${maxY}`);
console.log(`cropped     ${cropW}x${cropH} (aspect ${(cropW / cropH).toFixed(2)}:1)`);
console.log(`discarded   ${(100 - (cropW * cropH * 100) / (width * height)).toFixed(1)}% of the frame as whitespace`);

const dstW = Math.min(targetWidth, cropW);
const dstH = Math.max(1, Math.round((cropH / cropW) * dstW));
const out = resample(gray, width, height, sx, sy, cropW, cropH, dstW, dstH);

let inked = 0;
for (const v of out) if (v < 160) inked++;

const png = encodeGrayPng(out, dstW, dstH);
writeFileSync("worker-app/public/receipt-logo.png", png);

console.log(`output      ${dstW}x${dstH}, ${(png.length / 1024).toFixed(1)} KB`);
console.log(`ink cover   ${((inked * 100) / out.length).toFixed(1)}% of pixels print black`);
console.log("written     worker-app/public/receipt-logo.png");
