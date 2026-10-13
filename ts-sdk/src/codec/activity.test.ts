// The `pod_activity` frame fold. None of it is reachable from `typecheck`: a
// frame is `unknown` off the socket and off REST alike, so every field mapping
// is only ever checked here.
//
// Shapes are written from the node: `ActivityFrame`/`MoneyEvent` in
// `node/src/rpc/activity.rs`, and the JSON its own tests assert
// (`node/tests/activity_frame.rs`, `clob_indexer::tests`). Encodings follow
// from those types: a `WireDec` is a signed decimal string, and an absent field
// is absent rather than null.

import { describe, expect, it } from "vitest";

import type { Address, MarketId, MoneyActivity, Order } from "../types/public.js";
import type { WireActivityFrame } from "../types/wire.js";
import { applyActivityFrame } from "./activity.js";
import { WAD } from "./units.js";

const ALICE = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;
const TOKEN = "0x7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e" as Address;
const BOOK = "0x000000000000000000000000000000000000000000000000000000000000000a" as MarketId;
const TICK = 5_000_000;
const ORDER = "0x0101010101010101010101010101010101010101010101010101010101010101";

const units = (n: bigint) => n * WAD;
const money = (events: ReturnType<typeof applyActivityFrame>) =>
  events.filter((e): e is MoneyActivity => "activityType" in e);
const kinds = (events: ReturnType<typeof applyActivityFrame>) =>
  events.map((e) => ("activityType" in e ? e.activityType : e.kind));

/** The shape `the_wire_is_tagged_stringly_and_never_null` asserts: one frame per
 * tick, no `book` on the frame, books first and then the tick's money. */
const FRAME: WireActivityFrame = {
  batch: TICK,
  orders: [{
    id: ORDER,
    tx: "0x6565656565656565656565656565656565656565656565656565656565656565",
    book: BOOK,
    n: 1,
    px: units(100n).toString(),
    sz: units(2n).toString(),
    end: 3_605_000_000,
  }],
  events: [
    { k: "new", o: 0 },
    {
      k: "fill",
      o: 0,
      b: units(1n).toString(),
      q: units(100n).toString(),
      tb: units(1n).toString(),
      tq: units(100n).toString(),
      tf: "7",
    },
    {
      k: "backstop",
      book: BOOK,
      size: (-units(2n)).toString(),
      cash: "0",
      mark: units(100n).toString(),
      equity: (-units(5n)).toString(),
      pnl: (-units(1n)).toString(),
    },
    {
      k: "bridge_transfer",
      tx: "0x0000000000000000000000000000000000000000000000000000000000000001",
      idx: 1,
      token: TOKEN,
      amount: units(10n).toString(),
    },
    {
      k: "transfer",
      id: "0x0000000000000000000000000000000000000000000000000000000000000005",
      token: TOKEN,
      amount: (-units(5n)).toString(),
      error: "insufficient_balance",
    },
  ],
};

describe("applyActivityFrame", () => {
  it("folds the order flow and reports the money the tick moved, in wire order", () => {
    const orders = new Map<string, Order>();
    const events = applyActivityFrame(FRAME, orders, { account: ALICE });

    expect(kinds(events)).toEqual(["new", "fill", "backstop", "bridge_transfer", "transfer"]);

    const order = orders.get(ORDER);
    expect(order?.status).toBe("active");
    expect(order?.filledBase).toBe(units(1n));
    expect(order?.includedMs).toBe(5_000);
    // `book` moved from the frame onto the entity; there is no frame-level one.
    expect(order?.orderbookId).toBe(BOOK);
    // A frame with no `accts` covers exactly one account.
    expect(order?.bidder).toBe(ALICE);
    // Every money event is timed by the batch that moved it.
    expect(money(events).every((e) => e.timeMs === 5_000)).toBe(true);
  });

  it("decodes each money kind, signed from the account's side", () => {
    const [backstop, bridge, transfer] = money(applyActivityFrame(FRAME, new Map(), { account: ALICE }));

    if (backstop?.activityType !== "backstop") throw new Error("expected a backstop entry");
    expect(backstop.orderbookId).toBe(BOOK);
    expect(backstop.size).toBe(-units(2n));
    expect(backstop.markPrice).toBe(units(100n));
    expect(backstop.realizedPnl).toBe(-units(1n));

    if (bridge?.activityType !== "bridge_transfer") throw new Error("expected a bridge entry");
    expect(bridge.txHash).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
    // One tx can carry several deposits, so the hash alone does not identify a row.
    expect(bridge.idx).toBe(1);
    expect(bridge.token).toBe(TOKEN);
    expect(bridge.amount).toBe(units(10n));
    expect(bridge.error).toBeUndefined();

    if (transfer?.activityType !== "transfer") throw new Error("expected a transfer entry");
    expect(transfer.amount).toBe(-units(5n));
    expect(transfer.error).toBe("insufficient_balance");
  });

  it("ignores a kind it does not know, on either side of the union", () => {
    const orders = new Map<string, Order>();
    const events = applyActivityFrame(
      { ...FRAME, events: [{ k: "new", o: 0 }, { k: "liquidation_notice", o: 0 }, { k: "airdrop", amount: "1" } as never] },
      orders,
      { account: ALICE },
    );
    expect(kinds(events)).toEqual(["new"]);
    expect(orders.size).toBe(1);
  });
});

/** A REST page attaches the as-placed entity of an order placed before the page
 * to the first frame that references it, with no `new` of its own. */
const HYDRATED: WireActivityFrame = {
  batch: TICK + 1_000_000,
  orders: [FRAME.orders[0]!],
  events: [{
    k: "fill",
    id: ORDER,
    b: units(1n).toString(),
    q: units(100n).toString(),
    tb: units(2n).toString(),
    tq: units(200n).toString(),
    tf: "9",
    st: "filled",
  }],
};

describe("applyActivityFrame on a hydrated entity", () => {
  it("creates the order from its terms, with no placement time", () => {
    const orders = new Map<string, Order>();
    const events = applyActivityFrame(HYDRATED, orders, { account: ALICE });
    expect(kinds(events)).toEqual(["fill"]);
    const order = orders.get(ORDER);
    expect(order?.price).toBe(units(100n));
    expect(order?.includedMs).toBeUndefined();
    expect(order?.status).toBe("filled");
    expect(order?.filledBase).toBe(units(2n));
  });

  it("keeps the order the map already holds rather than resetting it", () => {
    const orders = new Map<string, Order>();
    applyActivityFrame(FRAME, orders, { account: ALICE });
    const held = orders.get(ORDER)!;
    applyActivityFrame(HYDRATED, orders, { account: ALICE });
    expect(orders.get(ORDER)).toBe(held);
    expect(held.includedMs).toBe(5_000);
    expect(held.fills).toHaveLength(2);
    expect(held.filledBase).toBe(units(2n));
  });
});

const BOOK_B = "0x000000000000000000000000000000000000000000000000000000000000000b" as MarketId;

const sweep = (book: MarketId) => ({
  k: "backstop" as const,
  book,
  size: (-units(2n)).toString(),
  cash: "0",
  mark: units(100n).toString(),
  equity: (-units(5n)).toString(),
  pnl: (-units(1n)).toString(),
});

describe("applyActivityFrame interleaving", () => {
  it("emits order and money events in the node's wire order", () => {
    const events = applyActivityFrame({
      batch: TICK,
      orders: [
        { id: "0x0a", tx: "0xaa", book: BOOK, n: 1, px: units(100n).toString(), sz: units(1n).toString() },
        { id: "0x0b", tx: "0xbb", book: BOOK_B, n: 2, px: units(100n).toString(), sz: units(1n).toString() },
      ],
      events: [{ k: "new", o: 0 }, sweep(BOOK), { k: "new", o: 1 }, sweep(BOOK_B)],
    }, new Map(), { account: ALICE });

    // Folding the orders first and appending the money would report the tick as
    // two placements followed by two sweeps, which is not what happened.
    expect(kinds(events)).toEqual(["new", "backstop", "new", "backstop"]);
    expect(money(events).map((e) => e.activityType === "backstop" ? e.orderbookId : e.activityType))
      .toEqual([BOOK, BOOK_B]);
  });
});
