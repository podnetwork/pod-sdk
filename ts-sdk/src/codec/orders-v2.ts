// `pod_orders_v2` frames -> the public `Order` map (ADR 0029).
//
// A frame is entity/event shaped: identity and terms cross the wire once, in
// `orders`, and everything after that is a reference. So decoding is two passes —
// materialize this batch's entities, then let the events say what happened to
// them and to orders already held. Status lives only in the events, which is what
// lets the server add transition kinds without changing the entity.

import type { Address, MarketId, MarketType, Order, OrderStatus, PartialFill } from "../types/public.js";
import type { WireOrderEntity, WireOrderEvent, WireOrdersFrame } from "../types/wire.js";
import { dec, endMsFromUs, usToMs, WAD } from "./units.js";

export interface OrdersFrameContext {
  /** The account the subscription is filtered to, used when the frame omits `accts`. */
  account: Address;
  /** Market type for a book, when the markets list has loaded. */
  marketType?: (book: MarketId) => MarketType | undefined;
  /** Receipt time (ms) stamped on this frame's fills — the wire carries none. */
  nowMs: number;
}

/**
 * Fold one frame into `byId`, in place.
 *
 * Events naming an order that is not in `byId` and not in this frame are skipped:
 * they belong to an order resting outside the caller's window, and its terms have
 * never been on the wire, so there is nothing to display.
 */
export function applyOrdersFrame(frame: WireOrdersFrame, byId: Map<string, Order>, ctx: OrdersFrameContext): void {
  const created = frame.orders.map((e) => decodeEntity(e, frame, ctx));

  for (const event of frame.events) {
    const target = event.o !== undefined ? created[event.o] : byId.get(event.id ?? "");
    if (!target) continue;
    applyEvent(event, target, ctx.nowMs);
  }

  // After the events, not before: an entity's own `new`/`reject` decides the
  // status it lands with. Entities left untouched by every event this version
  // understands are still inserted — the frame said the order exists, and a
  // transition from a newer server is no reason to drop the row.
  for (const order of created) byId.set(order.id, order);
}

function decodeEntity(e: WireOrderEntity, frame: WireOrdersFrame, ctx: OrdersFrameContext): Order {
  const initialSize = dec(e.sz);
  const batchMs = usToMs(frame.batch);
  return {
    id: e.id,
    txHash: e.tx,
    // The frame names the book, so this is exact — v1 carried a token pair and
    // left the id to be inferred from the markets list.
    orderbookId: frame.book,
    marketType: ctx.marketType?.(frame.book),
    side: initialSize < 0n ? "sell" : "buy",
    orderType: e.type === "market" ? "market" : "limit",
    // Not on the entity: an order that rests is `active`, and the events below
    // move it from there.
    status: "active",
    kind: (e.kind ?? "user_signed") as Order["kind"],
    nonce: e.n,
    // A frame with no `accts` covers exactly one account, so every row is its.
    bidder: (frame.accts && e.a !== undefined ? frame.accts[e.a] : ctx.account) as Address,
    price: dec(e.px),
    initialSize,
    filledBase: 0n,
    filledQuote: 0n,
    fee: 0n,
    // The signed deadline is not on the v2 wire. The batch the order landed in is
    // at or before it, which is what ordering and display need; the REST re-seed
    // replaces this with the signed value.
    deadlineMs: batchMs,
    endMs: endMsFromUs(e.end),
    includedMs: batchMs,
    fills: [],
    reduceOnly: e.reduce_only ?? false,
    ioc: e.ioc ?? false,
    triggerType: e.trigger as Order["triggerType"],
  };
}

/**
 * Take the order's life-to-date totals off the event that reports them.
 *
 * Every fill, cancel and expiry carries all three, zero included (ADR 0029 §4.1) —
 * so they are read unconditionally, and an order that leaves the book reports what
 * it filled rather than keeping whatever it last had. Authoritative rather than
 * accumulated, so a client that missed a fill cannot drift.
 */
function applyTotals(event: WireOrderEvent, order: Order): void {
  order.filledBase = dec(event.tb);
  order.filledQuote = dec(event.tq);
  order.fee = dec(event.tf);
  if (order.filledBase > 0n) order.effectivePrice = (order.filledQuote * WAD) / order.filledBase;
}

function applyEvent(event: WireOrderEvent, order: Order, nowMs: number): void {
  switch (event.k) {
    case "new":
      order.status = "active";
      break;
    case "reject":
      order.status = "invalid";
      order.rejectReason = event.why;
      break;
    case "cancel":
      order.status = "canceled";
      applyTotals(event, order);
      break;
    case "expire":
      order.status = "expired";
      applyTotals(event, order);
      break;
    case "modify": {
      order.price = dec(event.px);
      // `sz` is an unsigned magnitude, so the side comes from the order we hold.
      const sign = order.initialSize < 0n ? -1n : 1n;
      order.initialSize = sign * dec(event.sz);
      break;
    }
    case "fill": {
      applyTotals(event, order);
      // `b`/`q` are this fill alone. The wire carries no per-fill timestamp, so
      // receipt time is the closest thing available.
      const base = dec(event.b);
      const quote = dec(event.q);
      const fill: PartialFill = { base, quote, price: base > 0n ? (quote * WAD) / base : 0n, time: nowMs };
      order.fills = [...order.fills, fill];
      // Present only on the fill that closed the order.
      if (event.st) order.status = event.st as OrderStatus;
      break;
    }
    // ADR 0029 §6: kinds are open. An unrecognised one is ignored, not an error.
  }
}
