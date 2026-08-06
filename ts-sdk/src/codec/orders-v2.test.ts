// The `pod_orders_v2` frame decoder. None of this is reachable from
// `typecheck`: a frame is `unknown` off the socket, so every field mapping,
// every "omitted means X" default and every reference form is only ever checked
// here.
//
// The `new`, `expire` and `modify` frames below are verbatim captures from
// staging (wss://staging-rpc.podtestnet.dev, 2026-08-04). Fill, position and
// modify_reject cases are written from `node/src/rpc/orders_v2.rs` instead: staging
// only began crossing trades later, and its deployed build predates both `pa` and
// `modify_reject`, so those shapes have no captured bytes yet. Replacing them with
// captures is worth doing once a node build carries the fields.

import { describe, expect, it } from "vitest";

import type { Address, MarketId, Order } from "../types/public.js";
import type { WireOrdersFrame } from "../types/wire.js";
import { applyOrdersFrame } from "./orders-v2.js";
import { WAD } from "./units.js";

const MM = "0x55dee4dad525ba46e5d99c8dfa66662160dbd4ef" as Address;
const BOOK_7 = "0x0000000000000000000000000000000000000000000000000000000000000007" as MarketId;

/** Captured: four quotes created in one batch on book 7, each with a TTL. */
const NEW_FRAME: WireOrdersFrame = {
  book: BOOK_7,
  batch: 1785843401000000,
  accts: [MM],
  orders: [
    { id: "0xb3bd", tx: "0x8018", a: 0, n: 90643, px: "209430000000000000000", sz: "2390000000000000000", end: 1785843579686000 },
    { id: "0x32b8", tx: "0x8018", a: 0, n: 90643, px: "209840000000000000000", sz: "-2380000000000000000", end: 1785843579686000 },
  ],
  events: [{ k: "new", o: 0 }, { k: "new", o: 1 }],
};

/** Captured: four TTLs reached in one batch, all on orders resting from before. */
const EXPIRE_FRAME: WireOrdersFrame = {
  book: BOOK_7,
  batch: 1785843399500000,
  accts: [MM],
  orders: [],
  events: [{ k: "expire", id: "0x4770", a: 0 }, { k: "expire", id: "0xdead", a: 0 }],
};

/** Captured from a `bidder`-filtered stream: no `accts`, no `a`. */
const MODIFY_FRAME: WireOrdersFrame = {
  book: "0x0000000000000000000000000000000000000000000000000000000000000019",
  batch: 1785843559500000,
  orders: [],
  events: [{ k: "modify", id: "0xa9a5", px: "37990000000000000000", sz: "175484776695621584627" }],
};

/** A resting order the frame's events can reference, as the REST seed left it. */
function resting(over: Partial<Order> = {}): Order {
  return {
    id: "0xa9a5",
    txHash: "0xf00d",
    orderbookId: BOOK_7,
    side: "buy",
    orderType: "limit",
    status: "active",
    kind: "user_signed",
    nonce: 7,
    bidder: MM,
    price: 100n * WAD,
    initialSize: 5n * WAD,
    filledBase: 0n,
    filledQuote: 0n,
    fee: 0n,
    deadlineMs: 1785843000000,
    fills: [],
    ...over,
  };
}

function apply(frame: WireOrdersFrame, seed: Order[] = [], account = MM): Map<string, Order> {
  const byId = new Map(seed.map((o) => [o.id, o]));
  applyOrdersFrame(frame, byId, { account });
  return byId;
}

describe("applyOrdersFrame — entities", () => {
  it("decodes a captured `new` frame into orders keyed by id", () => {
    const byId = apply(NEW_FRAME);

    expect([...byId.keys()]).toEqual(["0xb3bd", "0x32b8"]);
    const buy = byId.get("0xb3bd")!;
    expect(buy).toMatchObject({
      id: "0xb3bd",
      txHash: "0x8018",
      // The frame names the book, so the id is stated rather than inferred.
      orderbookId: BOOK_7,
      bidder: MM,
      nonce: 90643,
      status: "active",
      orderType: "limit",
      kind: "user_signed",
      side: "buy",
      price: 209430000000000000000n,
      initialSize: 2390000000000000000n,
      filledBase: 0n,
      filledQuote: 0n,
      fee: 0n,
      fills: [],
      reduceOnly: false,
      ioc: false,
    });
    // `batch` is when the order landed — inclusion time, on a streamed order.
    expect(buy.includedMs).toBe(1785843401000);
    expect(buy.endMs).toBe(1785843579686);
  });

  it("reads the side off the sign of `sz`", () => {
    const sell = apply(NEW_FRAME).get("0x32b8")!;
    expect(sell.side).toBe("sell");
    expect(sell.initialSize).toBe(-2380000000000000000n);
  });

  it("takes the owner from the subscription when the frame omits `accts`", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      orders: [{ id: "0xnew1", tx: "0xtx", n: 1, px: "1", sz: "1" }],
      events: [{ k: "new", o: 0 }],
    };
    // A single-account stream carries no table, so the account is the one the
    // caller subscribed with — not undefined.
    expect(apply(frame).get("0xnew1")!.bidder).toBe(MM);
  });

  it("treats an omitted `end` as never expiring", () => {
    const frame: WireOrdersFrame = {
      ...NEW_FRAME,
      orders: [{ id: "0xnoend", tx: "0xtx", a: 0, n: 1, px: "1", sz: "1" }],
      events: [{ k: "new", o: 0 }],
    };
    // Omitted rather than sent as a u128 sentinel, so there is no 39-digit
    // number for a JS consumer to represent.
    expect(apply(frame).get("0xnoend")!.endMs).toBeUndefined();
  });

  it("maps the optional entity fields, and defaults each when omitted", () => {
    const frame: WireOrdersFrame = {
      ...NEW_FRAME,
      orders: [
        { id: "0xrich", tx: "0xtx", a: 0, n: 2, px: "1", sz: "-1", kind: "triggered", type: "market", reduce_only: true, ioc: true, trigger: "stop_loss", grouping: "asset" },
        { id: "0xplain", tx: "0xtx", a: 0, n: 3, px: "1", sz: "1" },
      ],
      events: [{ k: "new", o: 0 }, { k: "new", o: 1 }],
    };
    const byId = apply(frame);

    expect(byId.get("0xrich")).toMatchObject({
      kind: "triggered", orderType: "market", reduceOnly: true, ioc: true, triggerType: "stop_loss",
    });
    expect(byId.get("0xplain")).toMatchObject({
      kind: "user_signed", orderType: "limit", reduceOnly: false, ioc: false,
    });
    expect(byId.get("0xplain")!.triggerType).toBeUndefined();
  });
});

describe("applyOrdersFrame — events", () => {
  it("expires the orders a captured `expire` frame names, ignoring ids it does not hold", () => {
    const byId = apply(EXPIRE_FRAME, [resting({ id: "0x4770" })]);

    expect(byId.get("0x4770")!.status).toBe("expired");
    // 0xdead rests outside the seeded window: no phantom row for an order whose
    // terms we have never seen.
    expect(byId.has("0xdead")).toBe(false);
    expect(byId.size).toBe(1);
  });

  it("applies a captured `modify` in place, keeping the side", () => {
    const byId = apply(MODIFY_FRAME, [resting({ initialSize: -5n * WAD })]);

    const o = byId.get("0xa9a5")!;
    expect(o.price).toBe(37990000000000000000n);
    // `sz` is an unsigned magnitude, so the sign has to come from the order we
    // already hold — decoding it as written would flip a sell to a buy.
    expect(o.initialSize).toBe(-175484776695621584627n);
  });

  it("cancels by id", () => {
    const frame: WireOrdersFrame = { ...MODIFY_FRAME, events: [{ k: "cancel", id: "0xa9a5" }] };
    expect(apply(frame, [resting()]).get("0xa9a5")!.status).toBe("canceled");
  });

  it("takes the life-to-date totals a terminal event reports", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      events: [{ k: "cancel", id: "0xa9a5", tb: (2n * WAD).toString(), tq: (202n * WAD).toString(), tf: "7" }],
    };
    // ADR 0029 §4.1: a cancel says what the order had filled, so a partly filled
    // order that leaves the book does not keep a stale figure.
    const o = apply(frame, [resting({ filledBase: WAD, filledQuote: 100n * WAD })]).get("0xa9a5")!;
    expect(o.status).toBe("canceled");
    expect(o.filledBase).toBe(2n * WAD);
    expect(o.filledQuote).toBe(202n * WAD);
    expect(o.fee).toBe(7n);
    expect(o.effectivePrice).toBe(101n * WAD);
  });

  it("reports zero filled when a terminal event says zero", () => {
    const frame: WireOrdersFrame = { ...MODIFY_FRAME, events: [{ k: "expire", id: "0xa9a5", tb: "0", tq: "0", tf: "0" }] };
    // An untouched order reports zeros, and zero is not absence: it must land, so
    // a stale figure cannot survive the order leaving the book.
    const o = apply(frame, [resting({ filledBase: 3n * WAD })]).get("0xa9a5")!;
    expect(o.status).toBe("expired");
    expect(o.filledBase).toBe(0n);
  });

  it("applies a partial fill from the per-fill amounts and the running totals", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      events: [{
        k: "fill", id: "0xa9a5",
        b: (2n * WAD).toString(), q: (200n * WAD).toString(),
        tb: (3n * WAD).toString(), tq: (303n * WAD).toString(), tf: "5000",
      }],
    };
    const o = apply(frame, [resting({ filledBase: WAD, filledQuote: 103n * WAD, fills: [{ base: WAD, quote: 103n * WAD, price: 103n * WAD, time: 1 }] })]).get("0xa9a5")!;

    // Totals come from `tb`/`tq`/`tf` rather than from accumulation, so a client
    // that missed a fill cannot drift.
    expect(o.filledBase).toBe(3n * WAD);
    expect(o.filledQuote).toBe(303n * WAD);
    expect(o.fee).toBe(5000n);
    expect(o.effectivePrice).toBe(101n * WAD);
    // `b`/`q` are this fill alone, appended to the breakdown.
    expect(o.fills).toHaveLength(2);
    expect(o.fills[1]).toEqual({ base: 2n * WAD, quote: 200n * WAD, price: 100n * WAD, time: 1785843559500 });
    // No `st`: still working.
    expect(o.status).toBe("active");
  });

  it("classifies a perp fill from the position it left", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      events: [{
        k: "fill", id: "0xa9a5",
        b: (6n * WAD).toString(), q: (600n * WAD).toString(),
        tb: (6n * WAD).toString(), tq: (600n * WAD).toString(), tf: "0",
        pa: (4n * WAD).toString(),
      }],
    };
    // A sell of 6 that left the owner at +4 must have started at +10, so it reduced a
    // long. That is the label the order's own side and `reduceOnly` cannot reach: it
    // is a plain sell, so the derived guess reads "Open Short".
    const o = apply(frame, [resting({ initialSize: -6n * WAD })]).get("0xa9a5")!;
    expect(o.direction).toBe("reduce_long");
  });

  it("leaves direction unset on a spot fill, which reports no position", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      events: [{ k: "fill", id: "0xa9a5", b: "1", q: "1", tb: "1", tq: "1", tf: "0" }],
    };
    expect(apply(frame, [resting()]).get("0xa9a5")!.direction).toBeUndefined();
  });

  it("closes the order on the fill that carries `st`", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      events: [{ k: "fill", id: "0xa9a5", b: "1", q: "1", tb: "1", tq: "1", tf: "0", st: "margin_canceled" }],
    };
    expect(apply(frame, [resting()]).get("0xa9a5")!.status).toBe("margin_canceled");
  });

  it("fills an order created in the same frame, by index", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      orders: [{ id: "0xioc", tx: "0xtx", n: 4, px: (100n * WAD).toString(), sz: (1n * WAD).toString(), type: "market", ioc: true }],
      events: [
        { k: "new", o: 0 },
        { k: "fill", o: 0, b: (1n * WAD).toString(), q: (100n * WAD).toString(), tb: (1n * WAD).toString(), tq: (100n * WAD).toString(), tf: "1", st: "filled" },
      ],
    };
    // A market order can be created, filled and closed inside one batch; `o`
    // is the only way to name it, since it never rested.
    const o = apply(frame).get("0xioc")!;
    expect(o.status).toBe("filled");
    expect(o.filledBase).toBe(1n * WAD);
    expect(o.fills).toHaveLength(1);
  });

  it("records a rejected order with its reason", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      orders: [{ id: "0xbad", tx: "0xtx", n: 5, px: "1", sz: "1" }],
      events: [{ k: "reject", o: 0, why: "insufficient balance" }],
    };
    const o = apply(frame).get("0xbad")!;
    // A reject never rested, but it belongs in history — with why it failed.
    expect(o.status).toBe("invalid");
    expect(o.rejectReason).toBe("insufficient balance");
  });
});

describe("applyOrdersFrame — refused amendments", () => {
  it("records a refusal against the order, leaving the order itself alone", () => {
    const frame: WireOrdersFrame = {
      ...NEW_FRAME,
      orders: [],
      events: [{
        k: "modify_reject", id: "0xa9a5", by: 0,
        req_px: (101n * WAD).toString(), req_sz: (2n * WAD).toString(),
        code: "size_off_lot",
      }],
    };
    const o = apply(frame, [resting()]).get("0xa9a5")!;

    // The amendment did not happen, so price and size are untouched — that is the
    // whole point: a refusal used to be indistinguishable from one still in flight.
    expect(o.price).toBe(100n * WAD);
    expect(o.initialSize).toBe(5n * WAD);
    expect(o.status).toBe("active");
    expect(o.amendRejected).toEqual({
      requestedPrice: 101n * WAD,
      requestedSize: 2n * WAD,
      code: "size_off_lot",
      message: undefined,
      // `by` is the requester, resolved through the frame's accts table.
      requestedBy: MM,
      batchMs: 1785843401000,
    });
  });

  it("keeps the message when the code cannot carry the detail", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      events: [{
        k: "modify_reject", id: "0xa9a5",
        req_px: "1", req_sz: "1",
        code: "insufficient_balance", why: "need 5 have 2",
      }],
    };
    const o = apply(frame, [resting()]).get("0xa9a5")!;
    expect(o.amendRejected?.code).toBe("insufficient_balance");
    expect(o.amendRejected?.message).toBe("need 5 have 2");
    // A single-account stream has no accts table, so there is no index to resolve.
    expect(o.amendRejected?.requestedBy).toBeUndefined();
  });

  it("treats a code from a newer server as unspecified rather than dropping the refusal", () => {
    const frame = {
      ...MODIFY_FRAME,
      events: [{ k: "modify_reject", id: "0xa9a5", req_px: "1", req_sz: "1", code: "some_future_reason", why: "detail" }],
    } as unknown as WireOrdersFrame;
    // The code is open (ADR 0029 §6). Knowing an amendment was refused matters more
    // than recognising why, so the refusal is kept and the message carries what is left.
    const o = apply(frame, [resting()]).get("0xa9a5")!;
    expect(o.amendRejected?.code).toBe("some_future_reason");
    expect(o.amendRejected?.message).toBe("detail");
  });

  it("ignores a refusal for an order it does not hold", () => {
    const frame: WireOrdersFrame = {
      ...MODIFY_FRAME,
      events: [{ k: "modify_reject", id: "0xnotmine", req_px: "1", req_sz: "1", code: "order_not_found" }],
    };
    // `order_not_found` names an order that may never have existed, so there is
    // nothing to attach the refusal to.
    const byId = apply(frame, [resting()]);
    expect(byId.get("0xa9a5")!.amendRejected).toBeUndefined();
    expect(byId.has("0xnotmine")).toBe(false);
  });
});

describe("applyOrdersFrame — forward compatibility", () => {
  it("ignores event kinds it does not know", () => {
    const frame = {
      ...MODIFY_FRAME,
      events: [
        { k: "trigger_fired", id: "0xa9a5", something: 1 },
        { k: "cancel", id: "0xa9a5" },
      ],
    } as unknown as WireOrdersFrame;
    // ADR 0029 §6: new kinds arrive without a channel version, so an unknown one
    // must not throw and must not stop the events after it.
    expect(apply(frame, [resting()]).get("0xa9a5")!.status).toBe("canceled");
  });

  it("keeps an entity whose only event is a kind it does not know", () => {
    const frame = {
      ...MODIFY_FRAME,
      orders: [{ id: "0xfut", tx: "0xtx", n: 6, px: "1", sz: "1" }],
      events: [{ k: "adl", o: 0 }],
    } as unknown as WireOrdersFrame;
    // The order exists — the frame said so. Dropping it because the transition
    // is from a newer server would lose a row we can otherwise display.
    expect(apply(frame).has("0xfut")).toBe(true);
  });

  it("ignores an event that names neither `o` nor an id it holds", () => {
    const frame = { ...MODIFY_FRAME, events: [{ k: "cancel" }] } as unknown as WireOrdersFrame;
    expect(() => apply(frame, [resting()])).not.toThrow();
    expect(apply(frame, [resting()]).get("0xa9a5")!.status).toBe("active");
  });
});
