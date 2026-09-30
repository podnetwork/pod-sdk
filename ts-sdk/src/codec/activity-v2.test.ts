// The activity seed's entry union and the `pod_activity_v2` frame fold. None of
// it is reachable from `typecheck`: an entry is `unknown` off REST and a frame is
// `unknown` off the socket, so every field mapping is only ever checked here.
//
// Shapes are written from the node: `ActivityEntry` in `node/src/rpc/types.rs`,
// `ActivityFrame`/`MoneyEvent` in `node/src/rpc/activity_v2.rs`, and the JSON its
// own tests assert (`node/tests/activity_v2_frame.rs`, `clob_indexer::rest::tests`).
// Encodings follow from those types: a `U256` is `0x` hex, an `I256` a signed
// decimal string, a `WireDec` a signed decimal string, and an absent field is
// absent rather than null.

import { describe, expect, it } from "vitest";

import type { ActivityEntry, Address, MarketId } from "../types/public.js";
import type { WireActivityEntry, WireActivityFrame } from "../types/wire.js";
import { decodeActivityEntry } from "./decode.js";
import { applyActivityFrame } from "./activity-v2.js";
import { WAD } from "./units.js";

const ALICE = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;
const TOKEN = "0x7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e" as Address;
const BOOK = "0x000000000000000000000000000000000000000000000000000000000000000a" as MarketId;
const TICK = 5_000_000;

const hex = (n: bigint) => `0x${n.toString(16)}`;
const units = (n: bigint) => n * WAD;

/** `{ activity_type: "order", timestamp_us, ...OrderResponse }`. */
const ORDER_ENTRY: WireActivityEntry = {
  activity_type: "order",
  timestamp_us: 8_000_000,
  orderbook_id: BOOK,
  market_type: "perpetual",
  kind: "user_signed",
  order_id: "0x0101010101010101010101010101010101010101010101010101010101010101",
  tx_hash: "0x6565656565656565656565656565656565656565656565656565656565656565",
  bidder: ALICE,
  nonce: 1,
  order_type: "limit",
  status: "active",
  side: "buy",
  price: hex(units(100n)),
  initial_size: units(2n).toString(),
  filled_base_amount: hex(units(1n)),
  filled_quote_amount: hex(units(100n)),
  fee: "0x7",
  deadline: 8_000_000,
  end: 3_605_000_000,
  included_batch: TICK,
  effective_price: hex(units(100n)),
  fills: [{
    base_amount: hex(units(1n)),
    quote_amount: hex(units(100n)),
    timestamp: TICK,
    price: hex(units(100n)),
  }],
  reduce_only: false,
  ioc: false,
};

/** `{ activity_type: "backstop", timestamp_us, ...BackstopTransferResponse }` —
 * the flattened response carries `user` and its own `timestamp` too. */
const BACKSTOP_ENTRY: WireActivityEntry = {
  activity_type: "backstop",
  timestamp_us: TICK,
  user: ALICE,
  orderbook_id: BOOK,
  size: (-units(2n)).toString(),
  cash: "0",
  mark_price: hex(units(100n)),
  equity: (-units(5n)).toString(),
  realized_pnl: (-units(1n)).toString(),
  timestamp: TICK,
};

const BRIDGE_ENTRY: WireActivityEntry = {
  activity_type: "bridge_transfer",
  timestamp_us: TICK,
  tx_hash: "0x0000000000000000000000000000000000000000000000000000000000000001",
  token: TOKEN,
  amount: "-900",
  error: "insufficient_balance",
};

const TRANSFER_ENTRY: WireActivityEntry = {
  activity_type: "transfer",
  timestamp_us: TICK,
  transfer_id: "0x0000000000000000000000000000000000000000000000000000000000000003",
  token: TOKEN,
  amount: "1700",
};

describe("decodeActivityEntry", () => {
  it("carries an order through with its fills", () => {
    const entry = decodeActivityEntry(ORDER_ENTRY);
    expect(entry.activityType).toBe("order");
    if (entry.activityType !== "order") return;
    // The node timestamps an order entry by its SIGNED deadline, not the batch it
    // landed in, so `timeMs` and `order.includedMs` are deliberately different.
    expect(entry.timeMs).toBe(8_000);
    expect(entry.order.includedMs).toBe(5_000);
    expect(entry.order.marketType).toBe("perp");
    expect(entry.order.price).toBe(units(100n));
    expect(entry.order.initialSize).toBe(units(2n));
    expect(entry.order.fills).toHaveLength(1);
  });

  it("carries a backstop leg with its realized PnL", () => {
    const entry = decodeActivityEntry(BACKSTOP_ENTRY);
    expect(entry.activityType).toBe("backstop");
    if (entry.activityType !== "backstop") return;
    expect(entry.timeMs).toBe(5_000);
    expect(entry.orderbookId).toBe(BOOK);
    expect(entry.size).toBe(-units(2n));
    expect(entry.markPrice).toBe(units(100n));
    expect(entry.equity).toBe(-units(5n));
    expect(entry.realizedPnl).toBe(-units(1n));
  });

  it("keeps money signed from the account's side, with its refusal", () => {
    const bridge = decodeActivityEntry(BRIDGE_ENTRY);
    expect(bridge.activityType).toBe("bridge_transfer");
    if (bridge.activityType !== "bridge_transfer") return;
    expect(bridge.txHash).toBe(BRIDGE_ENTRY.tx_hash);
    expect(bridge.amount).toBe(-900n);
    expect(bridge.error).toBe("insufficient_balance");

    const transfer = decodeActivityEntry(TRANSFER_ENTRY);
    expect(transfer.activityType).toBe("transfer");
    if (transfer.activityType !== "transfer") return;
    expect(transfer.transferId).toBe(TRANSFER_ENTRY.transfer_id);
    expect(transfer.amount).toBe(1700n);
    expect(transfer.error).toBeUndefined();
  });
});

/** The shape `the_wire_is_tagged_stringly_and_never_null` asserts: one frame per
 * tick, no `book` on the frame, books first and then the tick's money. */
const FRAME: WireActivityFrame = {
  batch: TICK,
  orders: [{
    id: "0x0101010101010101010101010101010101010101010101010101010101010101",
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

const emptyState = () => ({ orders: new Map(), entries: [] as ActivityEntry[] });

describe("applyActivityFrame", () => {
  it("folds the order flow and collects the money the tick moved", () => {
    const state = emptyState();
    const events = applyActivityFrame(FRAME, state, { account: ALICE });

    expect(events.map((e) => ("activityType" in e ? e.activityType : e.kind)))
      .toEqual(["new", "fill", "backstop", "bridge_transfer", "transfer"]);

    const order = state.orders.get(FRAME.orders[0]!.id);
    expect(order?.status).toBe("active");
    expect(order?.filledBase).toBe(units(1n));
    // `book` moved from the frame onto the entity; there is no frame-level one.
    expect(order?.orderbookId).toBe(BOOK);
    // A frame with no `accts` covers exactly one account.
    expect(order?.bidder).toBe(ALICE);

    expect(state.entries.map((e) => e.activityType))
      .toEqual(["backstop", "bridge_transfer", "transfer"]);
    // Every money entry is timed by the batch that moved it.
    expect(state.entries.every((e) => e.timeMs === 5_000)).toBe(true);
  });

  it("decodes each money kind into the entry the seed would have served", () => {
    const state = emptyState();
    applyActivityFrame(FRAME, state, { account: ALICE });
    const [backstop, bridge, transfer] = state.entries;

    if (backstop?.activityType !== "backstop") throw new Error("expected a backstop entry");
    expect(backstop.orderbookId).toBe(BOOK);
    expect(backstop.size).toBe(-units(2n));
    expect(backstop.markPrice).toBe(units(100n));
    expect(backstop.realizedPnl).toBe(-units(1n));

    if (bridge?.activityType !== "bridge_transfer") throw new Error("expected a bridge entry");
    expect(bridge.txHash).toBe("0x0000000000000000000000000000000000000000000000000000000000000001");
    expect(bridge.token).toBe(TOKEN);
    expect(bridge.amount).toBe(units(10n));
    expect(bridge.error).toBeUndefined();

    if (transfer?.activityType !== "transfer") throw new Error("expected a transfer entry");
    expect(transfer.amount).toBe(-units(5n));
    expect(transfer.error).toBe("insufficient_balance");
  });

  it("ignores a kind it does not know, on either side of the union", () => {
    const state = emptyState();
    const events = applyActivityFrame(
      { ...FRAME, events: [{ k: "liquidation_notice", o: 0 }, { k: "airdrop", amount: "1" } as never] },
      state,
      { account: ALICE },
    );
    expect(events).toEqual([]);
    expect(state.entries).toEqual([]);
    // The entity still lands: the frame said the order exists.
    expect(state.orders.size).toBe(1);
  });
});
