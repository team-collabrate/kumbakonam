# receipt-logo.png

The mark printed at the top of every bill. Generated — don't hand-edit it.

## Regenerating

The brand master lives at the repo root (`logo-b-w.png`). To rebuild the
printable copy after changing it:

```
node scripts/prepare-receipt-logo.mjs logo-b-w.png 480
```

That trims the artwork to its ink, resamples it, and writes this file. The
current logo went from 3375×4219 (3.0 MB) to 480×253 (56 KB) — 73% of the
source frame was whitespace.

## Why it can't just be dropped in

Thermal printing is one-bit: every dot is on or off. Three things follow.

**Whitespace has to go first.** The receipt scales the image to fit its box.
An untrimmed logo scales its *padding* to fit, leaving the artwork a smudge in
the middle of an empty rectangle.

**The width is not arbitrary.** 80 mm paper is 576 dots across; the logo is
prepared at exactly the 480 the receipt draws at, so the canvas never resamples
it. Resampling twice softens hairlines right before they get crushed to 1-bit.
Change the width here *and* `LOGO_MAX_W` in
`worker-app/src/printing/receiptCanvas.ts` together, or you reintroduce the
second resample.

**Line art only.** Solid black on white reproduces. Photographs, grey fills and
soft gradients all threshold to mud.

## Cost per bill

253 dots of logo is about 1.25 in (32 mm) of paper on every receipt, and it
roughly doubles the bytes sent to the printer. If the roll is going too fast,
regenerate at a smaller width — nothing else needs to change.

## If the file is missing

The receipt renders without it rather than failing, so a missing or broken logo
degrades to a text-only bill instead of blocking the sale.
