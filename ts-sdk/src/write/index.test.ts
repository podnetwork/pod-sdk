import { describe, expect, it, vi } from "vitest";

import { decodeFunctionData, getAddress, parseAbi } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { createDelegatedWallet } from "./delegation.js";
import {
  alignSize, BRIDGE_ADDRESS, buildClosePosition, buildOrderWithTriggers, buildSubmitBatch,
  buildSubmitOrder, buildSubmitTrigger, buildUpdateOrder, buildUpdateTrigger, buildWithdraw,
  decodeRevertReason, sendRawTransaction, waitForReceipt,
} from "./index.js";
import type { Hash } from "../types/public.js";

const TX = `0x${"ab".repeat(32)}` as Hash;

/** Serves one `eth_getTransactionReceipt` result, then repeats it. */
function fakeReceipt(result: unknown) {
  return vi.fn(async () => ({ json: async () => ({ jsonrpc: "2.0", id: 1, result }) })) as unknown as typeof fetch;
}

const base = { status: "0x1", transactionHash: TX, gasUsed: "0xf4240" };

describe("waitForReceipt", () => {
  it("returns a receipt with no block rather than throwing", async () => {
    const fetchFn = fakeReceipt({ ...base, blockNumber: null, blockHash: null, transactionIndex: null });
    await expect(waitForReceipt("http://rpc", TX, { fetch: fetchFn, timeoutMs: 50 })).resolves.toEqual({
      status: "success",
      transactionHash: TX,
      blockNumber: null,
      gasUsed: 1_000_000n,
    });
  });

  it("reports the height for a sequenced tx", async () => {
    const fetchFn = fakeReceipt({ ...base, blockNumber: "0x1a4" });
    const r = await waitForReceipt("http://rpc", TX, { fetch: fetchFn, timeoutMs: 50 });
    expect(r.blockNumber).toBe(420n);
  });

  it("keeps polling while the node has no receipt", async () => {
    const fetchFn = fakeReceipt(null);
    await expect(waitForReceipt("http://rpc", TX, { fetch: fetchFn, timeoutMs: 10, pollMs: 1 })).rejects.toThrow(
      /timed out/,
    );
  });
});

const WITHDRAW_ABI = parseAbi([
  "function withdraw(address token, address to, uint256 amount, uint128 deadline)",
]);
const TOKEN = getAddress("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
const RECIPIENT = getAddress("0x000000000000000000000000000000000c1a1111");

function withdrawTx() {
  return buildWithdraw({
    token: TOKEN,
    recipient: RECIPIENT,
    amount: 10n ** 18n,
    auctionIntervalUs: 500_000,
    deadline: 1_700_000_000_000,
  });
}

describe("buildWithdraw", () => {
  it("calls the bridge precompile, not the CLOB (ADR 0042)", () => {
    const tx = withdrawTx();
    expect(tx.to).toBe(BRIDGE_ADDRESS);
    expect(decodeFunctionData({ abi: WITHDRAW_ABI, data: tx.data })).toEqual({
      functionName: "withdraw",
      args: [TOKEN, RECIPIENT, 10n ** 18n, 1_700_000_000_000_000n],
    });
  });
});

describe("buildSubmitBatch", () => {
  it("refuses a leg aimed off the CLOB precompile", () => {
    expect(() => buildSubmitBatch([withdrawTx()])).toThrow(/CLOB calls only/);
  });
});

describe("delegated submit", () => {
  it("refuses a transaction aimed off the CLOB precompile", async () => {
    const master = privateKeyToAccount(generatePrivateKey());
    const wallet = await createDelegatedWallet({
      master: master.address,
      chainId: 1293,
      rpcUrl: "http://rpc.invalid",
      ttlMs: 60 * 60_000,
      signTypedData: (td) => master.signTypedData(td as never),
    });
    // Rejected before any RPC call: an unreachable rpcUrl would throw otherwise.
    await expect(wallet.submit(withdrawTx())).rejects.toThrow(/master wallet/);
  });
});

// --- Lot alignment ------------------------------------------------------------

const ORDERBOOK = `0x${"00".repeat(31)}07` as Hash;
const LOT = 10n ** 12n; // 1e-6 base units — every staging/canary perp
const OFF_LOT = 3n * LOT + 1n;
const CLOB_TEST_ABI = parseAbi([
  "function submitOrder(bytes32 orderbookId, int256 size, uint256 price, uint8 orderType, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc)",
  "function update(bytes32 orderbookId, bytes32 updatedOrder, uint256 newSize, uint256 newPrice, address token, uint128 deadline)",
  "function submitTrigger(bytes32 orderbookId, int256 size, uint256 limitPrice, uint256 triggerPrice, uint8 triggerType, uint8 grouping, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc)",
  "function updateTrigger(bytes32 orderbookId, bytes32 triggerOrder, int256 newSize, uint256 newLimitPrice, uint256 newTriggerPrice, uint128 deadline)",
  "function submitBatch(bytes[] inner)",
]);

/** The `size` a built leg encodes; the amend calls carry the order id before it. */
const encodedSize = (tx: { data: `0x${string}` }) => {
  const { functionName, args } = decodeFunctionData({ abi: CLOB_TEST_ABI, data: tx.data });
  return args![functionName === "update" || functionName === "updateTrigger" ? 2 : 1] as bigint;
};

const order = (over: Partial<Parameters<typeof buildSubmitOrder>[0]> = {}) =>
  buildSubmitOrder({
    orderbookId: ORDERBOOK,
    side: "buy",
    orderType: "limit",
    price: 10n ** 18n,
    size: OFF_LOT,
    lotSize: LOT,
    deadline: 1_700_000_000_000,
    ...over,
  });

describe("alignSize", () => {
  it("floors to the lot, and passes an unconstrained lot through", () => {
    expect(alignSize(OFF_LOT, LOT)).toBe(3n * LOT);
    expect(alignSize(OFF_LOT, 1n)).toBe(OFF_LOT);
    expect(alignSize(OFF_LOT, 0n)).toBe(OFF_LOT);
  });

  it("floors a sub-lot size to zero rather than up to one lot", () => {
    // Deliberate: rounding up would spend money the caller did not offer.
    expect(alignSize(LOT - 1n, LOT)).toBe(0n);
  });
});

describe("buildSubmitOrder", () => {
  it("encodes a lot-aligned size, taking the sign AFTER flooring", () => {
    // Flooring a negative would round the magnitude the wrong way.
    expect(encodedSize(order({ side: "sell" }))).toBe(-3n * LOT);
    expect(encodedSize(order({ side: "buy" }))).toBe(3n * LOT);
  });

  it("leaves the size alone when no lot is given", () => {
    expect(encodedSize(order({ lotSize: undefined }))).toBe(OFF_LOT);
  });
});

describe("buildUpdateOrder", () => {
  it("floors the amended size to the lot, ignoring the sign it was handed", () => {
    const tx = (size: bigint) => buildUpdateOrder({
      orderbookId: ORDERBOOK,
      orderId: TX,
      price: 10n ** 18n,
      size,
      token: TOKEN,
      lotSize: LOT,
      deadline: 1_700_000_000_000,
    });
    expect(encodedSize(tx(OFF_LOT))).toBe(3n * LOT);
    expect(encodedSize(tx(-OFF_LOT))).toBe(3n * LOT); // contract takes a magnitude
  });
});

describe("buildSubmitTrigger / buildUpdateTrigger", () => {
  it("floor the trigger size to the lot", () => {
    const submit = buildSubmitTrigger({
      orderbookId: ORDERBOOK,
      side: "sell",
      size: OFF_LOT,
      triggerType: "take_profit",
      triggerPrice: 10n ** 18n,
      lotSize: LOT,
      deadline: 1_700_000_000_000,
    });
    const update = buildUpdateTrigger({
      orderbookId: ORDERBOOK,
      triggerOrderId: TX,
      side: "sell",
      size: OFF_LOT,
      triggerPrice: 10n ** 18n,
      lotSize: LOT,
      deadline: 1_700_000_000_000,
    });
    expect(encodedSize(submit)).toBe(-3n * LOT);
    expect(encodedSize(update)).toBe(-3n * LOT);
  });
});

describe("buildOrderWithTriggers", () => {
  /** The `size` each leg of a batch encodes, entry first. */
  const legSizes = (tx: { data: `0x${string}` }) => {
    const { args } = decodeFunctionData({ abi: CLOB_TEST_ABI, data: tx.data });
    return (args![0] as `0x${string}`[]).map((data) => encodedSize({ data }));
  };

  const withTp = (over: object = {}) => buildOrderWithTriggers({
    orderbookId: ORDERBOOK,
    side: "buy",
    orderType: "limit",
    price: 10n ** 18n,
    size: OFF_LOT,
    lotSize: LOT,
    takeProfit: { triggerPrice: 2n * 10n ** 18n, ...over },
    deadline: 1_700_000_000_000,
  });

  it("closes exactly the aligned entry size with a full-size TP", () => {
    // Scaling the raw size would leave the TP one lot over the position.
    const [entry, tp] = legSizes(withTp());
    expect(entry).toBe(3n * LOT);
    expect(tp).toBe(-3n * LOT);
  });

  it("floors a fractional TP leg to the lot", () => {
    // A fraction of an aligned size is not aligned: half of 3 lots is 1.5.
    expect(legSizes(withTp({ sizeFraction: 0.5 }))[1]).toBe(-1n * LOT);
  });
});

describe("buildClosePosition", () => {
  it("floors a partial close down, never up", () => {
    // Rounding up would ask to close more than the position holds.
    const tx = buildClosePosition({
      orderbookId: ORDERBOOK,
      side: "long",
      size: OFF_LOT,
      price: 10n ** 18n,
      lotSize: LOT,
      deadline: 1_700_000_000_000,
    });
    expect(encodedSize(tx)).toBe(-3n * LOT);
  });
});

describe("decodeRevertReason", () => {
  it("returns undefined for a non-string payload instead of throwing", () => {
    // −32003 sends an array and 999 an object; both used to throw on `data.startsWith`.
    expect(decodeRevertReason([{ error: "Insufficient balance" }])).toBeUndefined();
    expect(decodeRevertReason({ locked: true })).toBeUndefined();
    expect(decodeRevertReason(undefined)).toBeUndefined();
  });
});

describe("sendRawTransaction", () => {
  it("keeps the JSON-RPC code and falls back to the message off an Error(string)", async () => {
    const fetchFn = vi.fn(async () => ({
      json: async () => ({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32003, message: "rejected by quorum", data: [{ error: "Insufficient balance" }] },
      }),
    })) as unknown as typeof fetch;
    await expect(sendRawTransaction("http://rpc", "0xdeadbeef", { fetch: fetchFn })).rejects.toMatchObject({
      name: "PodTxRevertError",
      reason: "rejected by quorum",
      code: -32003,
    });
  });
});
