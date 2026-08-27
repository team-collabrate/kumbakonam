# Receipt logo

Save the shop logo in this folder as **`receipt-logo.png`** and it will print
centred at the top of every bill (and show on the on-screen bill).

If the file is absent the receipt simply renders without it — nothing breaks.

## What reproduces well

Thermal printing is **1-bit**: every dot is either burned or blank, there is no
grey. So:

- Use **solid black line art on a white/transparent background** — the brand
  mark you already have is ideal.
- Avoid photographs, gradients, and thin grey strokes; they dither into mud.
- Around **520 x 300 px** is plenty. It is scaled to fit 260 px wide on the
  paper, so anything larger is wasted detail.

Adjust the threshold in `src/printing/escposRaster.ts` (`INK_THRESHOLD`) if the
logo prints too heavy or too faint.
