// `pod_orders_v2` frames -> the public `Order` map (ADR 0029).
//
// A frame is entity/event shaped: identity and terms cross the wire once, in
// `orders`, and everything after that is a reference. So decoding is two passes —
// materialize this batch's entities, then let the events say what happened to
// them and to orders already held. Status lives only in the events, which is what
// lets the server add transition kinds without changing the entity.

import type { Address, Order, OrderStatus, PartialFill, RejectCode } from "../types/public.js";
import type { WireOrderEntity, WireOrderEvent, WireOrdersFrame } from "../types/wire.js";
import { dec, endMsFromUs, usToMs, WAD } from "./units.js";
import { classifyPerpDirection } from "./direction.js";

export interface OrdersFrameContext {
  /** The account the subscription is filtered to, used when the frame omits `accts`. */
  account: Address;
}

/** Per-frame facts the events need: the batch they landed in and who they belong to. */
interface FrameFacts {
  batchMs: number;
  accts?: WireOrdersFrame["accts"];
  account: Address;
}

/** Volume-weighted price of a filled amount; zero base has no price. */
const vwap = (quote: bigint, base: bigint) => (base > 0n ? (quote * WAD) / base : 0n);

/**
 * Fold one frame into `byId`, in place.
 *
 * Events naming an order that is not in `byId` and not in this frame are skipped:
 * they belong to an order resting outside the caller's window, and its terms have
 * never been on the wire, so there is nothing to display.
 */
export function applyOrdersFrame(frame: WireOrdersFrame, byId: Map<string, Order>, ctx: OrdersFrameContext): void {
  // The book and the batch are frame constants: resolved once, not per entity.
  const batchMs = usToMs(frame.batch);
  const facts: FrameFacts = { batchMs, accts: frame.accts, account: ctx.account };
  const created = frame.orders.map((e) => decodeEntity(e, frame, batchMs, ctx.account));

  for (const event of frame.events) {
    // `o` indexes this frame's entities and `id` names one resting from an earlier
    // batch — but an event kind added later (ADR 0029 §6 reserves several) may name
    // an entity from *this* frame by id, so try both before giving up. `created` is
    // not in `byId` yet: entities are inserted after the events, so their own
    // `new`/`reject` decides the status they land with.
    const target = event.o !== undefined
      ? created[event.o]
      : byId.get(event.id ?? "") ?? created.find((o) => o.id === event.id);
    if (!target) continue;
    applyEvent(event, target, facts);
  }

  // After the events, not before: an entity's own `new`/`reject` decides the
  // status it lands with. Entities left untouched by every event this version
  // understands are still inserted — the frame said the order exists, and a
  // transition from a newer server is no reason to drop the row.
  for (const order of created) byId.set(order.id, order);
}

function decodeEntity(e: WireOrderEntity, frame: WireOrdersFrame, batchMs: number, account: Address): Order {
  const initialSize = dec(e.sz);
  return {
    id: e.id,
    txHash: e.tx,
    // The frame names the book, so this is exact rather than inferred. Whether
    // that book is spot or perp is static market metadata, joined at read time by
    // whoever needs it — freezing it here would strand every order decoded before
    // the markets list loaded.
    orderbookId: frame.book,
    side: initialSize < 0n ? "sell" : "buy",
    orderType: e.type === "market" ? "market" : "limit",
    // Not on the entity: an order that rests is `active`, and the events below
    // move it from there.
    status: "active",
    kind: (e.kind ?? "user_signed") as Order["kind"],
    nonce: e.n,
    // A frame with no `accts` covers exactly one account, so every row is its. An
    // index the table does not reach falls back the same way rather than becoming an
    // `undefined` typed as an address.
    bidder: (e.a !== undefined ? frame.accts?.[e.a] : undefined) ?? account,
    price: dec(e.px),
    initialSize,
    filledBase: 0n,
    filledQuote: 0n,
    fee: 0n,
    endMs: endMsFromUs(e.end),
    // When the order became real. The signed deadline is not on this wire and is
    // deliberately not invented from the batch: REST reports both separately, so
    // inclusion time is the one thing every source agrees on and the only honest
    // key to order by.
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
  // Cleared, not skipped, when nothing is filled: a row reporting zero filled beside
  // a fill price from before is worse than one with no fill price.
  order.effectivePrice = order.filledBase > 0n ? vwap(order.filledQuote, order.filledBase) : undefined;
}

function applyEvent(event: WireOrderEvent, order: Order, facts: FrameFacts): void {
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
      // `b`/`q` are this fill alone, and its time is the batch it cleared in — the
      // auction's own timestamp rather than when this client happened to read it.
      const base = dec(event.b);
      const quote = dec(event.q);
      const fill: PartialFill = { base, quote, price: vwap(quote, base), time: facts.batchMs };
      order.fills = [...order.fills, fill];
      // A perp fill reports the position it left. The position it started from is
      // that minus what this fill moved it — a buy raises it, a sell lowers it — and
      // the transition is what says whether the order opened, added to, reduced,
      // closed or flipped. Without it a client can only guess from the order's own
      // side and `reduceOnly`, which calls a plain sell that closed a long an
      // "Open Short".
      if (event.pa !== undefined) {
        const after = dec(event.pa);
        const before = after - (order.initialSize < 0n ? -base : base);
        order.direction = classifyPerpDirection(before, after);
      }
      // Present only on the fill that closed the order.
      if (event.st) order.status = event.st as OrderStatus;
      break;
    }
    case "modify_reject":
      // The order is untouched: this answers an amendment that did not happen. Without
      // it a refused price change looks exactly like one still in flight. `by` is the
      // requester, not the owner — on `not_order_owner` it is precisely who does not
      // own the order — so it is resolved separately from `a`.
      order.amendRejected = {
        requestedPrice: dec(event.req_px),
        requestedSize: dec(event.req_sz),
        code: (event.code ?? "unspecified") as RejectCode,
        message: event.why,
        requestedBy: event.by !== undefined ? facts.accts?.[event.by] : undefined,
        batchMs: facts.batchMs,
      };
      break;
    // ADR 0029 §6: kinds are open. An unrecognised one is ignored, not an error.
  }
}
