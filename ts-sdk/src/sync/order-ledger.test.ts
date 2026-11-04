import { describe, expect, it } from "vitest";

import type { Address, Hex, MarketId, Order } from "../types/public.js";
import type { WireActivityEntry, WireOrder } from "../types/wire.js";
import type { ActivityPage } from "../transport/rest.js";
import { OrderLedger } from "./order-ledger.js";

const BOOK = "0x000000000000000000000000000000000000000000000000000000000000000a" as MarketId;
const ACCOUNT = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;
const id = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as Hex;

const held = (n: number, over: Partial<Order> = {}): Order => ({
  id: id(n), txHash: id(n + 100), orderbookId: BOOK, side: "buy", orderType: "limit", status: "active",
  kind: "user_signed", nonce: n, bidder: ACCOUNT, price: 100n, initialSize: 2n,
  filledBase: 0n, filledQuote: 0n, fee: 0n, ...over,
});

/** A stream frame that fills one order by `base` and adds `pnl`, the two non-idempotent effects. */
interface Frame { id: Hex; base: bigint; pnl?: bigint; create?: Order }
const fold = (f: Frame, orders: Map<string, Order>): string[] => {
  if (f.create) orders.set(f.create.id, { ...f.create });
  const o = orders.get(f.id);
  if (!o) return [];
  o.filledBase += f.base;
  if (f.pnl !== undefined) o.realizedPnl = (o.realizedPnl ?? 0n) + f.pnl;
  return [f.id];
};

const wireOrder = (n: number, over: Partial<WireOrder> = {}): WireActivityEntry => ({
  k: "order", order_id: id(n), orderbook_id: BOOK, kind: "user_signed", tx_hash: id(n + 100), bidder: ACCOUNT,
  nonce: n, order_type: "limit", status: "active", side: "buy", price: "100", initial_size: "2",
  filled_base_amount: "0", filled_quote_amount: "0", fee: "0", deadline: 1, end: 0, ...over,
});
const wireFill = (n: number, tb: string, pnl?: string): WireActivityEntry => ({
  k: "fill", id: id(n), book: BOOK, b: "1", q: "100", tb, tq: "100", tf: "0", pnl,
});
const wireCancel = (n: number): WireActivityEntry => ({ k: "termination", id: id(n), book: BOOK, st: "canceled" });

const page = (solutionNowUs: number, batches: Record<number, WireActivityEntry[]>): ActivityPage => ({
  batches: Object.entries(batches).map(([b, e]): [number, WireActivityEntry[]] => [Number(b), e]).sort((a, b) => b[0] - a[0]),
  nextUs: null,
  solutionNow: Math.trunc(solutionNowUs / 1000),
  solutionNowUs,
});

const at = (l: OrderLedger<Frame, string[]>, n: number) => l.view.get(id(n));

describe("OrderLedger", () => {
  it("replays the frames above a REST row onto it, and not those at or below", () => {
    const l = new OrderLedger(fold);
    l.live(10, { id: id(1), base: 1n, create: held(1) });
    l.live(20, { id: id(1), base: 1n });
    l.live(30, { id: id(1), base: 1n });
    // The row was read at 20, so it already holds the frames at 10 and 20.
    l.rows([held(1, { filledBase: 2n })], 20);
    expect(at(l, 1)?.filledBase).toBe(3n);
  });

  it("keeps a held row newer than the one a lagging read returns", () => {
    const l = new OrderLedger(fold);
    l.rows([held(1, { filledBase: 5n })], 50);
    l.rows([held(1, { filledBase: 1n })], 40);
    expect(at(l, 1)?.filledBase).toBe(5n);
  });

  it("reports a live frame REST already covers, without applying it twice", () => {
    const l = new OrderLedger(fold);
    l.rows([held(1, { filledBase: 4n, realizedPnl: 7n })], 40);
    // A frame from a WebSocket node behind the REST node: the app still has to hear about the fill.
    expect(l.live(30, { id: id(1), base: 1n, pnl: 1n })).toEqual([id(1)]);
    expect(at(l, 1)).toMatchObject({ filledBase: 4n, realizedPnl: 7n });
    l.live(50, { id: id(1), base: 1n, pnl: 1n });
    expect(at(l, 1)).toMatchObject({ filledBase: 5n, realizedPnl: 8n });
  });

  it("recovers a transition the stream lost, outside any page the client loaded", () => {
    const l = new OrderLedger(fold);
    l.rows([held(1)], 10);
    l.stampUs = 10;
    // The stream dropped the fill at 20; the frame at 40 arrives.
    l.live(40, { id: id(1), base: 0n, pnl: 2n });
    expect(l.reconcile([page(30, { 20: [wireFill(1, "1", "5")], 30: [wireCancel(1)] })])).toBe(true);
    expect(at(l, 1)).toMatchObject({ filledBase: 1n, status: "canceled", realizedPnl: 7n });
    expect(l.stampUs).toBe(30);
  });

  it("takes an order row as the order's state at its read, and skips that order's transitions", () => {
    const l = new OrderLedger(fold);
    l.stampUs = 10;
    l.live(20, { id: id(2), base: 0n, create: held(2) });
    const pages = [page(30, { 20: [wireOrder(2, { filled_base_amount: "1", status: "filled" })], 25: [wireFill(2, "1")] })];
    expect(l.reconcile(pages)).toBe(true);
    expect(at(l, 2)).toMatchObject({ filledBase: 1n, status: "filled" });
  });

  it("drops a reconcile below its stamp", () => {
    const l = new OrderLedger(fold);
    l.rows([held(1)], 50);
    l.stampUs = 50;
    expect(l.reconcile([page(40, { 45: [wireCancel(1)] })])).toBe(false);
    expect(at(l, 1)?.status).toBe("active");
  });

  it("replays only the frames above the reconcile, once", () => {
    const l = new OrderLedger(fold);
    l.rows([held(1)], 10);
    l.stampUs = 10;
    l.live(20, { id: id(1), base: 1n });
    l.live(30, { id: id(1), base: 1n });
    l.reconcile([page(20, { 20: [wireFill(1, "1")] })]);
    expect(at(l, 1)?.filledBase).toBe(2n);
  });

  it("keeps the order objects the view hands out, so rows that reference them stay current", () => {
    const l = new OrderLedger(fold);
    l.rows([held(1)], 10);
    l.stampUs = 10;
    const ref = at(l, 1)!;
    l.reconcile([page(20, { 20: [wireCancel(1)] })]);
    expect(ref.status).toBe("canceled");
  });

  it("keeps an order only the stream knows across a reconcile", () => {
    const l = new OrderLedger(fold);
    l.stampUs = 10;
    l.live(5, { id: id(3), base: 1n, create: held(3) });
    l.reconcile([page(20, {})]);
    expect(at(l, 3)?.filledBase).toBe(1n);
  });

  it("raises the minimum past evicted frames, so a reconcile cannot answer below them", () => {
    const l = new OrderLedger(fold);
    l.stampUs = 1;
    for (let us = 2; us <= 1_026; us++) l.live(us, { id: id(1), base: 0n });
    expect(l.minimum()).toBe(2);
    l.reconcile([page(2_000, {})]);
    expect(l.minimum()).toBe(2_000);
  });
});
