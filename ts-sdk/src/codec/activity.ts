import type { ActivityEntry, ActivityEvent, Order, OrderEventKind } from "../types/public.js";
import type { WireActivityEntry, WireOrderEvent } from "../types/wire.js";
import { decodeOrder } from "./decode.js";
import { applyEvent } from "./orders-v2.js";
import { dec, decOpt, usToMs } from "./units.js";

/** One activity row, or `undefined` for an unknown kind. */
export function decodeActivityEntry(e: WireActivityEntry, timeMs: number): ActivityEntry | undefined {
  switch (e.k) {
    case "order":
      return { activityType: "order", timeMs, order: decodeOrder(e) };
    case "fill":
      return {
        activityType: "fill",
        timeMs,
        orderId: e.id,
        orderbookId: e.book,
        base: dec(e.b),
        quote: dec(e.q),
        totalBase: decOpt(e.tb),
        totalQuote: decOpt(e.tq),
        totalFee: decOpt(e.tf),
        fee: decOpt(e.f),
        closedAs: e.st,
        positionAfter: decOpt(e.pa),
      };
    case "modify":
      return {
        activityType: "modify",
        timeMs,
        orderId: e.id,
        orderbookId: e.book,
        price: dec(e.px),
        size: dec(e.sz),
        oldPrice: dec(e.old_px),
        oldSize: dec(e.old_sz),
      };
    case "termination":
      return {
        activityType: "termination",
        timeMs,
        orderId: e.id,
        orderbookId: e.book,
        status: e.st,
      };
    case "backstop":
      return {
        activityType: "backstop",
        timeMs,
        time: timeMs,
        orderbookId: e.book,
        size: dec(e.sz),
        cash: dec(e.cash),
        markPrice: dec(e.mark),
        equity: dec(e.eq),
        realizedPnl: dec(e.pnl),
      };
    case "bridge_transfer":
      return {
        activityType: "bridge_transfer",
        timeMs,
        txHash: e.tx,
        idx: e.idx,
        token: e.tok,
        amount: dec(e.amt),
        // An empty string is the wire saying "no reason".
        error: e.err || undefined,
      };
    case "transfer":
      return {
        activityType: "transfer",
        timeMs,
        transferId: e.id,
        counterparty: e.cp,
        token: e.tok,
        amount: dec(e.amt),
        error: e.err || undefined,
      };
    case "modify_reject":
      return {
        activityType: "modify_reject",
        timeMs,
        orderId: e.id,
        orderbookId: e.book,
        requestedPrice: dec(e.px),
        requestedSize: dec(e.sz),
        message: e.why,
      };
    case "cancel_reject":
      return {
        activityType: "cancel_reject",
        timeMs,
        orderId: e.id,
        orderbookId: e.book,
        message: e.why,
      };
    default:
      return undefined;
  }
}

function asOrderEvent(e: WireActivityEntry): WireOrderEvent | undefined {
  switch (e.k) {
    case "fill":
      return { k: "fill", id: e.id, b: e.b, q: e.q, tb: e.tb, tq: e.tq, tf: e.tf, f: e.f, st: e.st, pa: e.pa };
    case "modify":
      return { k: "modify", id: e.id, px: e.px, sz: e.sz };
    case "termination":
      return { k: e.st === "expired" ? "expire" : "cancel", id: e.id, st: e.st };
    default:
      return undefined;
  }
}

/**
 * Decode one batch, setting its `order` rows in `orders` and applying transitions to the
 * orders it holds. Only a `stream` batch emits events. A REST page's `order` rows already
 * carry their current state, so a REST batch applies nothing to an order in `pageOrders`.
 */
export function foldActivityBatch(
  batchUs: number,
  entries: WireActivityEntry[],
  orders: Map<string, Order>,
  source: "stream" | { pageOrders: ReadonlySet<string> },
): { rows: ActivityEntry[]; events: ActivityEvent[] } {
  const rest = source !== "stream";
  const batchMs = usToMs(batchUs);
  const rows: ActivityEntry[] = [];
  const events: ActivityEvent[] = [];
  for (const e of entries) {
    const row = decodeActivityEntry(e, batchMs);
    if (!row) continue;
    rows.push(row);
    if (row.activityType === "order") {
      orders.set(row.order.id, row.order);
      if (!rest) {
        events.push({ kind: row.order.status === "invalid" ? "reject" : "new", order: row.order, batchMs });
      }
      continue;
    }
    if (row.activityType === "backstop" || row.activityType === "bridge_transfer" || row.activityType === "transfer") {
      if (!rest) events.push(row);
      continue;
    }
    const order = orders.get(row.orderId);
    if (!order || (rest && source.pageOrders.has(row.orderId))) continue;
    if (rest) {
      const event = asOrderEvent(e);
      if (event) applyEvent(event, order, { batchMs });
      continue;
    }
    if (row.activityType === "modify_reject") {
      const { requestedPrice, requestedSize, message } = row;
      events.push({
        kind: "modify_reject", order, batchMs,
        amendRejection: { requestedPrice, requestedSize, code: "unspecified", message, batchMs },
      });
      continue;
    }
    if (row.activityType === "cancel_reject") {
      events.push({
        kind: "cancel_reject", order, batchMs,
        cancelRejection: { code: "unspecified", message: row.message, batchMs },
      });
      continue;
    }
    const event = asOrderEvent(e);
    const outcome = event && applyEvent(event, order, { batchMs });
    if (event && outcome) events.push({ kind: event.k as OrderEventKind, order, batchMs, fill: outcome.fill });
  }
  return { rows, events };
}
