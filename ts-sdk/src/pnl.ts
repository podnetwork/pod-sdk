// The PnL graph, folded client-side from `GET /clob/pnl-history/{account}`'s inputs.
// Mirrors the engine's arithmetic exactly: `mul` is `price·size/1e18`
// truncated toward zero, `settlingIndex` is the funding index the positions
// settle against. The node keeps a reference fold in its tests; keep them in
// sync.
import { div, mul } from "./codec/fixed.js";
import { WAD } from "./codec/units.js";
import type { PnlHistoricalData, PnlPoint } from "./types/public.js";

/** Nearest multiple of `grid`, ties away from zero, odd in `value`; the
 * identity when `grid` is zero. */
export function quantizeToGrid(value: bigint, grid: bigint): bigint {
  if (grid === 0n) return value;
  const negative = value < 0n;
  const raw = negative ? -value : value;
  let rounded = (raw / grid) * grid;
  if ((raw - rounded) * 2n >= grid) rounded += grid;
  return negative ? -rounded : rounded;
}

/** The index positions settle against: the published accumulator divided by
 * the funding window and quantized to the market's grid. */
export function settlingIndex(fundingIndex: bigint, fundingWindowUs: number, grid: bigint): bigint {
  return quantizeToGrid(div(fundingIndex, BigInt(fundingWindowUs) * WAD), grid);
}

const newestAtOrBefore = <T extends { timeUs: number }>(rows: readonly T[], t: number) =>
  rows.filter((r) => r.timeUs <= t).at(-1);

/** PnL at every multiple of `stepUs` inside `[fromUs, toUs)`. A point is the
 * account as of the newest batch at or before its time. Points before the
 * account's first record, and points at which an open leg or holding has no
 * price yet, are omitted rather than priced at zero: a gap means missing data. */
export function pnlSeries(data: PnlHistoricalData): PnlPoint[] {
  const { fromUs, toUs, stepUs } = data;
  if (!Number.isInteger(stepUs) || stepUs <= 0) throw new RangeError("stepUs must be a positive integer");
  const out: PnlPoint[] = [];
  points: for (let t = Math.ceil(fromUs / stepUs) * stepUs; t < toUs; t += stepUs) {
    const realizedRow = newestAtOrBefore(data.realized, t);
    let unrealized = 0n;
    let funding = 0n;
    let anyLeg = false;
    for (const market of data.markets) {
      const row = newestAtOrBefore(market.positions, t);
      if (!row) continue;
      anyLeg = true;
      if (row.size === 0n) continue;
      const tick = newestAtOrBefore(market.ticks, t);
      if (!tick) continue points;
      if (market.marketType === "perp") {
        if (tick.fundingIndex === undefined || market.fundingGrid === undefined) continue points;
        unrealized += mul(tick.markPrice, row.size) - row.costBasis;
        const f = settlingIndex(tick.fundingIndex, market.fundingWindowUs, market.fundingGrid);
        funding += mul(f, row.size) - row.fundingBasis;
      } else {
        if (tick.clearingPrice === undefined) continue points;
        unrealized += mul(tick.clearingPrice, row.size) - row.costBasis;
      }
    }
    if (realizedRow || anyLeg) {
      const realized = realizedRow?.realized ?? 0n;
      out.push({ time: t / 1000, realized, unrealized, funding, pnl: realized + unrealized - funding });
    }
  }
  return out;
}
