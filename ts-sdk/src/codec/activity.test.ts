// Shapes follow `ActivityEntry` in `node/src/rpc/activity.rs`.

import { describe, expect, it } from "vitest";

import type { Address, Hex, MarketId, Order } from "../types/public.js";
import type { WireActivityEntry, WireOrder } from "../types/wire.js";
import { decodeActivityEntry, foldActivityBatch } from "./activity.js";
import { WAD } from "./units.js";

const ALICE = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;
const BOB = "0xb0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0b0" as Address;
const TOKEN = "0x7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e" as Address;
const BOOK = "0x000000000000000000000000000000000000000000000000000000000000000a" as MarketId;
const BATCH = 5_000_000;
const MS = BATCH / 1000;

const units = (n: bigint) => (n * WAD).toString();
const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;
const hex = (n: bigint) => `0x${n.toString(16)}`;

const order = (n: number, over: Partial<WireOrder> = {}): WireActivityEntry => ({
  k: "order", order_id: id(n), orderbook_id: BOOK, market_type: "perpetual", kind: "user_signed", tx_hash: id(n + 100),
  bidder: ALICE, nonce: n, order_type: "limit", status: "active", side: "buy", price: hex(100n * WAD),
  initial_size: units(2n), filled_base_amount: "0x0", filled_quote_amount: "0x0", fee: "0x0",
  deadline: String(BATCH), end: 3_605_000_000, included_batch: BATCH, effective_price: "0x0", ...over,
});
const FILLED = order(1, {
  status: "filled", filled_base_amount: hex(2n * WAD), filled_quote_amount: hex(200n * WAD), fee: "0x7",
});
const fill = (n: number, over: Partial<Extract<WireActivityEntry, { k: "fill" }>> = {}): WireActivityEntry => ({
  k: "fill", id: id(n), book: BOOK, b: units(1n), q: units(100n), tb: units(1n), tq: units(100n), tf: "7", f: "2", ...over,
});
const BACKSTOP: WireActivityEntry = {
  k: "backstop", book: BOOK, sz: `-${units(2n)}`, cash: "0", mark: units(100n), eq: `-${units(5n)}`, pnl: `-${units(1n)}`,
};
const BRIDGE: WireActivityEntry = { k: "bridge_transfer", tx: id(21), idx: 1, tok: TOKEN, amt: "-900", err: "insufficient_balance" };
const TRANSFER: WireActivityEntry = { k: "transfer", id: id(22), cp: BOB, tok: TOKEN, amt: "1700" };

const pageOrders = (entries: WireActivityEntry[]) => new Set(entries.flatMap((e) => (e.k === "order" ? [e.order_id] : [])));
const fold = (entries: WireActivityEntry[], orders = new Map<string, Order>(), source: "rest" | "stream" = "stream") =>
  ({ ...foldActivityBatch(BATCH, entries, orders, source === "rest" ? { pageOrders: pageOrders(entries) } : "stream"), orders });
const kindOf = (e: { activityType: string } | { kind: string }) => ("activityType" in e ? e.activityType : e.kind);

describe("decodeActivityEntry", () => {
  it("decodes a fill with its totals, closing status and position", () => {
    expect(decodeActivityEntry(fill(1, { st: "filled", pa: `-${units(3n)}` }), MS)).toEqual({
      activityType: "fill", timeMs: MS, orderId: id(1), orderbookId: BOOK,
      base: WAD, quote: 100n * WAD, totalBase: WAD, totalQuote: 100n * WAD, totalFee: 7n, fee: 2n,
      closedAs: "filled", positionAfter: -3n * WAD,
    });
  });

  it("leaves the totals absent on a fill stored before they were recorded", () => {
    const row = decodeActivityEntry(fill(1, { tb: undefined, tq: undefined, tf: undefined, f: undefined }), MS);
    if (row?.activityType !== "fill") throw new Error("expected a fill");
    expect([row.totalBase, row.totalQuote, row.totalFee, row.fee, row.closedAs, row.positionAfter]).toEqual([
      undefined, undefined, undefined, undefined, undefined, undefined,
    ]);
  });

  it("decodes a modify, a termination and both refusals", () => {
    expect(decodeActivityEntry({
      k: "modify", id: id(1), book: BOOK, px: units(101n), sz: units(3n), old_px: units(100n), old_sz: units(2n),
    }, MS)).toMatchObject({ activityType: "modify", price: 101n * WAD, size: 3n * WAD, oldPrice: 100n * WAD, oldSize: 2n * WAD });
    const termination = decodeActivityEntry({ k: "termination", id: id(1), book: BOOK, st: "self_trade_canceled" }, MS);
    expect(termination).toMatchObject({ activityType: "termination", status: "self_trade_canceled" });
    expect(termination).not.toHaveProperty("totalBase");
    expect(decodeActivityEntry({
      k: "modify_reject", id: id(1), book: BOOK, px: units(1n), sz: units(1n), why: "price off tick",
    }, MS)).toEqual({
      activityType: "modify_reject", timeMs: MS, orderId: id(1), orderbookId: BOOK,
      requestedPrice: WAD, requestedSize: WAD, message: "price off tick",
    });
    expect(decodeActivityEntry({
      k: "cancel_reject", id: id(1), book: BOOK, why: "gone",
    }, MS)).toEqual({ activityType: "cancel_reject", timeMs: MS, orderId: id(1), orderbookId: BOOK, message: "gone" });
  });

  it("keeps money signed from the account's side", () => {
    expect(decodeActivityEntry(BACKSTOP, MS)).toMatchObject({
      activityType: "backstop", timeMs: MS, orderbookId: BOOK, size: -2n * WAD, equity: -5n * WAD, realizedPnl: -WAD,
    });
    expect(decodeActivityEntry(BRIDGE, MS)).toMatchObject({
      activityType: "bridge_transfer", txHash: id(21), idx: 1, amount: -900n, error: "insufficient_balance",
    });
    expect(decodeActivityEntry(TRANSFER, MS)).toMatchObject({ activityType: "transfer", transferId: id(22), amount: 1700n });
  });

  it("names the other side of a transfer on both legs", () => {
    expect(decodeActivityEntry({ k: "transfer", id: id(23), cp: BOB, tok: TOKEN, amt: "-1700" }, MS))
      .toMatchObject({ activityType: "transfer", counterparty: BOB, token: TOKEN, amount: -1700n });
    expect(decodeActivityEntry({ k: "transfer", id: id(23), cp: ALICE, tok: TOKEN, amt: "1700", err: "" }, MS))
      .toEqual({ activityType: "transfer", timeMs: MS, transferId: id(23), counterparty: ALICE, token: TOKEN, amount: 1700n, error: undefined });
  });

  it("decodes an order with the state it carries", () => {
    const row = decodeActivityEntry(FILLED, MS);
    if (row?.activityType !== "order") throw new Error("expected an order");
    expect(row.timeMs).toBe(MS);
    expect(row.order).toMatchObject({
      id: id(1), status: "filled", marketType: "perp", filledBase: 2n * WAD, filledQuote: 200n * WAD, fee: 7n, includedMs: MS,
    });
    expect(row.order).not.toHaveProperty("fills");
    expect(row.order.realizedPnl).toBeUndefined();
  });

  it("carries the realized PnL a perp order closed", () => {
    const row = decodeActivityEntry(order(1, { status: "filled", realized_pnl: `-${units(1n)}` }), MS);
    if (row?.activityType !== "order") throw new Error("expected an order");
    expect(row.order.realizedPnl).toBe(-WAD);
  });

  it("returns undefined for a kind it does not know", () => {
    expect(decodeActivityEntry({ k: "airdrop" } as never, MS)).toBeUndefined();
  });
});

describe("foldActivityBatch", () => {
  const BATCH_ENTRIES: WireActivityEntry[] = [
    order(1, { reduce_only: true }),
    order(2, { side: "sell", initial_size: `-${units(1n)}`, status: "invalid", invalid_reason: "insufficient balance" }),
    fill(1, { b: units(1n), tb: units(1n) }),
    fill(9),
    { k: "modify", id: id(1), book: BOOK, px: units(99n), sz: units(4n), old_px: units(100n), old_sz: units(2n) },
    { k: "termination", id: id(1), book: BOOK, st: "canceled" },
    BACKSTOP,
    BRIDGE,
    { k: "airdrop" } as never,
    TRANSFER,
    { k: "cancel_reject", id: id(1), book: BOOK, why: "order not found" },
  ];

  it("emits a stream batch's rows in wire order, with the placement carrying the folded order", () => {
    const { rows } = fold(BATCH_ENTRIES);
    expect(rows.map(kindOf)).toEqual([
      "order", "order", "fill", "fill", "modify", "termination", "backstop", "bridge_transfer", "transfer", "cancel_reject",
    ]);
    expect(rows.every((r) => r.timeMs === MS)).toBe(true);

    const [placed, refused] = rows;
    if (placed?.activityType !== "order" || refused?.activityType !== "order") throw new Error("expected orders");
    expect(placed.order).toMatchObject({
      status: "canceled", price: 99n * WAD, initialSize: 4n * WAD, filledBase: WAD, filledQuote: 100n * WAD,
      fee: 7n, bidder: ALICE, orderbookId: BOOK, includedMs: MS, endMs: 3_605_000, reduceOnly: true, kind: "user_signed",
    });
    expect(refused.order).toMatchObject({ status: "invalid", rejectReason: "insufficient balance", side: "sell" });
  });

  it("reports a stream batch's events for held orders only, and the money it moved", () => {
    const { events } = fold(BATCH_ENTRIES);
    expect(events.map(kindOf)).toEqual([
      "new", "reject", "fill", "modify", "cancel", "backstop", "bridge_transfer", "transfer", "cancel_reject",
    ]);
    const cancelReject = events.at(-1);
    if (!cancelReject || "activityType" in cancelReject) throw new Error("expected an order event");
    expect(cancelReject.cancelRejection).toEqual({ code: "unspecified", message: "order not found", batchMs: MS });
  });

  it("applies a refused amendment to nothing, and reports it", () => {
    const { rows, events } = fold([
      order(1),
      { k: "modify_reject", id: id(1), book: BOOK, px: units(1n), sz: units(9n), why: "tick" },
    ]);
    const placed = rows[0];
    if (placed?.activityType !== "order") throw new Error("expected an order");
    expect(placed.order.price).toBe(100n * WAD);
    const reject = events[1];
    if (!reject || "activityType" in reject) throw new Error("expected an order event");
    expect(reject.amendRejection).toEqual({
      requestedPrice: WAD, requestedSize: 9n * WAD, code: "unspecified", message: "tick", batchMs: MS,
    });
  });

  it("maps an expiry termination to an `expire` event", () => {
    const { events, orders } = fold([order(1), { k: "termination", id: id(1), book: BOOK, st: "expired" }]);
    expect(events.map(kindOf)).toEqual(["new", "expire"]);
    expect(orders.get(id(1))?.status).toBe("expired");
  });

  it("closes an order on a cap-to-filled zero-base fill", () => {
    const { orders } = fold([
      order(1),
      fill(1),
      fill(1, { b: "0", q: "0", tb: units(1n), tq: units(100n), st: "filled" }),
    ]);
    const o = orders.get(id(1))!;
    expect(o.status).toBe("filled");
    expect(o.filledBase).toBe(WAD);
  });

  it("folds an ADL synthetic order through its slices", () => {
    const { orders, events } = fold([
      order(1, { kind: "adl", order_type: "market", side: "sell", initial_size: `-${units(3n)}` }),
      fill(1, { b: units(1n), q: units(100n), tb: units(1n), tq: units(100n), tf: "1", f: "1" }),
      fill(1, { b: units(2n), q: units(200n), tb: units(3n), tq: units(300n), tf: "3", f: "2", st: "filled" }),
    ]);
    const o = orders.get(id(1))!;
    expect(o).toMatchObject({ kind: "adl", orderType: "market", side: "sell", status: "filled", filledBase: 3n * WAD });
    const fills = events.flatMap((e) => ("kind" in e && e.fill ? [[e.fill.totalBase, e.fill.fee]] : []));
    expect(fills).toEqual([[WAD, 1n], [3n * WAD, 2n]]);
    expect(o.fee).toBe(3n);
  });

  it("leaves the totals alone on a legacy fill without them", () => {
    const orders = new Map<string, Order>();
    fold([order(1), fill(1, { tb: units(2n), tq: units(200n), tf: "5" })], orders);
    foldActivityBatch(BATCH + 1, [fill(1, { tb: undefined, tq: undefined, tf: undefined })], orders, "stream");
    expect(orders.get(id(1))).toMatchObject({ filledBase: 2n * WAD, filledQuote: 200n * WAD, fee: 5n });
  });

  it("applies nothing and emits nothing for a REST page", () => {
    const { rows, events, orders } = fold(BATCH_ENTRIES, new Map(), "rest");
    expect(rows.map(kindOf)).toEqual([
      "order", "order", "fill", "fill", "modify", "termination", "backstop", "bridge_transfer", "transfer", "cancel_reject",
    ]);
    expect(events).toEqual([]);
    expect(orders.get(id(1))).toMatchObject({ status: "active", price: 100n * WAD, filledBase: 0n });
  });

  it("shows a pre-upgrade REST order filled from its own state", () => {
    const { rows, orders } = fold([FILLED], new Map(), "rest");
    expect(rows).toHaveLength(1);
    expect(orders.get(id(1))).toMatchObject({ status: "filled", filledBase: 2n * WAD });
  });

  it("adds a streamed fill's realized PnL to the order, and reports it on the fill", () => {
    const orders = new Map<string, Order>();
    fold([order(1, { realized_pnl: "10" })], orders, "rest");
    const { rows } = fold([fill(1, { pnl: "-4" })], orders);
    expect(orders.get(id(1))?.realizedPnl).toBe(6n);
    expect(rows[0]).toMatchObject({ activityType: "fill", realizedPnl: -4n });
  });

  it("takes realized PnL from a REST order row, never from a REST fill row", () => {
    const orders = new Map<string, Order>();
    fold([order(1, { realized_pnl: "10" })], orders, "rest");
    foldActivityBatch(BATCH + 1, [fill(1, { pnl: "10", tb: units(2n) })], orders, { pageOrders: new Set() });
    expect(orders.get(id(1))).toMatchObject({ realizedPnl: 10n, filledBase: 2n * WAD });
  });

  it("replaces a held order with the one a REST page carries", () => {
    const orders = new Map<string, Order>();
    fold([order(1)], orders, "stream");
    fold([FILLED], orders, "rest");
    expect(orders.get(id(1))?.status).toBe("filled");
  });
});
