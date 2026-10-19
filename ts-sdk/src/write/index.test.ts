import { describe, expect, it, onTestFinished, vi } from "vitest";
import { decodeFunctionData, getAddress, keccak256, parseAbi, parseTransaction, toFunctionSelector, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { createDelegatedWallet } from "./delegation.js";
import {
  alignSize, BRIDGE_ADDRESS, buildClosePosition, CLOB_ADDRESS, buildOrderWithTriggers, buildSubmitBatch,
  buildSubmitOrder, buildSubmitTrigger, buildUpdateOrder, buildUpdateTrigger, buildWithdraw,
  decodeRevertReason, MINT_ADDRESS, mint, NATIVE_USD_ADDRESS, PodTxRevertError, sendRawTransaction,
  waitForReceipt, type PodTxRequest,
} from "./index.js";
import type { Hash } from "../types/public.js";

const TX = `0x${"ab".repeat(32)}` as Hash;

/** Serves one `eth_getTransactionReceipt` result, then repeats it. */
function fakeReceipt(result: unknown) {
  return vi.fn(async () => ({ ok: true, json: async () => ({ jsonrpc: "2.0", id: 1, result }) })) as unknown as typeof fetch;
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

  it("keeps polling through a load balancer's HTML error page", async () => {
    const ok = fakeReceipt({ ...base, blockNumber: "0x1" });
    const html = { ok: false, status: 502, json: async () => JSON.parse("<html>502 Bad Gateway</html>") };
    const fetchFn = vi.fn().mockResolvedValueOnce(html).mockImplementation(ok) as unknown as typeof fetch;
    const r = await waitForReceipt("http://rpc", TX, { fetch: fetchFn, timeoutMs: 1000, pollMs: 1 });
    expect(r.status).toBe("success");
    expect(fetchFn).toHaveBeenCalledTimes(2);
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

describe("DelegatedWallet.submit", () => {
  type Reply = { result?: unknown; error?: { code: number; message: string; data?: unknown } } | Error | "hang";

  /** A node behind a load balancer: `eth_sendRawTransaction` answers come off `sends`. */
  async function setup(
    sends: Reply[], nonces: number[], receipts: unknown[] = [null], overrides: Record<string, Reply> = {},
  ) {
    const sent: Hex[] = [];
    const receiptQueries: string[] = [];
    const sentAt: number[] = [];
    let signs = 0;
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const req = JSON.parse(String(init!.body)) as { id: number; method: string; params: unknown[] };
      let reply: Reply;
      if (overrides[req.method]) {
        if (req.method === "eth_gasPrice") signs++;
        reply = overrides[req.method]!;
      } else switch (req.method) {
        case "eth_gasPrice": signs++; reply = { result: "0x1" }; break;
        case "eth_getTransactionCount": reply = { result: `0x${(nonces.length > 1 ? nonces.shift()! : nonces[0]!).toString(16)}` }; break;
        case "eth_getTransactionReceipt": receiptQueries.push(req.params[0] as string);
          reply = { result: receipts.length > 1 ? receipts.shift() : receipts[0] };
          break;
        case "eth_sendRawTransaction":
          sent.push(req.params[0] as Hex);
          sentAt.push(Date.now());
          reply = sends.shift()!;
          if (reply === "hang") {
            return new Promise((_, reject) => init!.signal?.addEventListener("abort", () => reject(init!.signal!.reason)));
          }
          break;
        case "eth_chainId": reply = { result: "0x50d" }; break;
        default: reply = { error: { code: -32601, message: "Method not found" } };
      }
      if (reply instanceof Error) throw reply;
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: req.id, ...(reply as object) }));
    }) as unknown as typeof fetch;
    const master = privateKeyToAccount(generatePrivateKey());
    const wallet = await createDelegatedWallet({
      master: master.address, chainId: 1293, rpcUrl: "http://rpc", ttlMs: 3_600_000, fetch: fetchFn,
      signTypedData: (td) => master.signTypedData(td),
    });
    return { wallet, sent, sentAt, receiptQueries, signs: () => signs };
  }

  const TX_REQ: PodTxRequest = {
    to: CLOB_ADDRESS, data: "0x", value: 0n, type: "eip1559",
    maxPriorityFeePerGas: 0n, gas: 1_000_000n,
  };
  const nonceOf = (raw: Hex) => parseTransaction(raw).nonce;

  const PAST_NONCE: Reply = {
    error: { code: 996, message: "Past nonce: tx nonce 3, expected 4", data: "past_nonce" },
  };

  /** Runs `submit` on fake timers, past the whole 10s budget. */
  const settle = async <T>(start: () => Promise<T>) => {
    vi.useFakeTimers();
    onTestFinished(() => { vi.useRealTimers(); });
    const pending = start().catch((e: Error) => e);
    await vi.advanceTimersByTimeAsync(11_000);
    return pending;
  };

  it("re-signs with a fresh nonce after a rejection on the first attempt, without a receipt check", async () => {
    const { wallet, sent, receiptQueries } = await setup([PAST_NONCE, { result: "0xok" }], [3, 4]);
    expect(await settle(() => wallet.submit(TX_REQ))).toBe("0xok");
    expect(sent.map(nonceOf)).toEqual([3, 4]);
    expect(receiptQueries).toEqual([]);
  });

  it("polls the receipt after a transport error then a past-nonce rejection", async () => {
    const { wallet, sent, receiptQueries, signs } = await setup(
      [new TypeError("fetch failed"), PAST_NONCE], [3], [null, null, { ...base, blockNumber: "0x1" }],
    );
    const hash = await settle(() => wallet.submit(TX_REQ));
    expect(sent).toHaveLength(2);
    expect(sent[1]).toBe(sent[0]);
    expect(hash).toBe(keccak256(sent[0]!));
    expect(receiptQueries).toEqual([hash, hash, hash]);
    expect(signs()).toBe(1);
  });

  it("reports delivery unknown, without re-signing, when no receipt appears", async () => {
    const { wallet, sent, signs } = await setup([new TypeError("fetch failed"), PAST_NONCE], [3]);
    const err = await settle(() => wallet.submit(TX_REQ));
    expect(String(err)).toMatch(/delivery unknown/);
    expect(String(err)).toContain(keccak256(sent[0]!));
    expect(sent).toHaveLength(2);
    expect(signs()).toBe(1);
  });

  it("resends the same bytes after a transport error", async () => {
    const { wallet, sent } = await setup([new TypeError("fetch failed"), { result: "0xok" }], [3]);
    expect(await settle(() => wallet.submit(TX_REQ))).toBe("0xok");
    expect(sent).toHaveLength(2);
    expect(sent[1]).toBe(sent[0]);
  });

  it("backs off 250ms, 500ms, then 1s between attempts", async () => {
    const down = new TypeError("fetch failed");
    const { wallet, sentAt } = await setup([down, down, down, down, { result: "0xok" }], [3]);
    expect(await settle(() => wallet.submit(TX_REQ))).toBe("0xok");
    expect(sentAt.slice(1).map((t, i) => t - sentAt[i]!)).toEqual([250, 500, 1000, 1000]);
  });

  it("aborts each hung send at 5s and reports delivery unknown when nothing lands", async () => {
    const { wallet, sent, signs } = await setup(["hang", "hang"], [3]);
    const err = await settle(() => wallet.submit(TX_REQ));
    expect(String(err)).toMatch(/delivery unknown/);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toBe(sent[0]);
    expect(signs()).toBe(1);
  });

  it("returns the hash of a hung send once its receipt appears", async () => {
    const { wallet, sent, signs } = await setup(["hang", PAST_NONCE], [3], [null, null, null, { ...base, blockNumber: "0x1" }]);
    const hash = await settle(() => wallet.submit(TX_REQ));
    expect(hash).toBe(keccak256(sent[0]!));
    expect(signs()).toBe(1);
  });

  it("does not retry a -32000 validation failure, even one about a nonce", async () => {
    const { wallet, sent } = await setup([
      { error: { code: -32000, message: "transaction validation failed", data: "Past nonce: tx nonce 3, expected 4" } },
    ], [3]);
    await expect(wallet.submit(TX_REQ)).rejects.toBeInstanceOf(PodTxRevertError);
    expect(sent).toHaveLength(1);
  });

  it("does not retry an execution revert", async () => {
    const { wallet, sent } = await setup([
      { error: { code: 3, message: "execution reverted", data: "0x" } },
    ], [3]);
    await expect(wallet.submit(TX_REQ)).rejects.toBeInstanceOf(PodTxRevertError);
    expect(sent).toHaveLength(1);
  });

  it.each(["eth_gasPrice", "eth_getTransactionCount"])("does not retry a JSON-RPC error from %s", async (method) => {
    const { wallet, sent, signs } = await setup([], [3], [null], {
      [method]: { error: { code: -32000, message: `${method} unavailable` } },
    });
    const err = await settle(() => wallet.submit(TX_REQ));
    expect(String(err)).toContain(`${method} unavailable`);
    expect(signs()).toBe(1);
    expect(sent).toHaveLength(0);
  });
});

describe("sendRawTransaction", () => {
  it("keeps the JSON-RPC error code on the rejection", async () => {
    const fetchFn = (async () => new Response(JSON.stringify({
      jsonrpc: "2.0", id: 1, error: { code: 996, message: "Account has pending transaction", data: "account_pending" },
    }))) as unknown as typeof fetch;
    const err = await sendRawTransaction("http://rpc", "0x01", { fetch: fetchFn }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PodTxRevertError);
    expect(err).toMatchObject({ code: 996, data: "account_pending", reason: "Account has pending transaction" });
  });
});

describe("mint", () => {
  it("encodes mint(address, (address, uint256)[], uint128 deadline) for the faucet", async () => {
    let raw: Hex | undefined;
    const fetchFn = vi.fn(async (_url: unknown, init?: RequestInit) => {
      const req = JSON.parse(String(init!.body)) as { method: string; params: unknown[] };
      if (req.method === "eth_sendRawTransaction") raw = req.params[0] as Hex;
      const result = req.method === "eth_gasPrice" ? "0x1"
        : req.method === "eth_sendRawTransaction" ? TX
        : { ...base, blockNumber: "0x1" };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }));
    }) as unknown as typeof fetch;
    const to = "0x00000000000000000000000000000000000000aa" as const;
    const before = BigInt(Date.now()) * 1000n;
    await mint({ rpcUrl: "http://rpc", chainId: 1293, to, tokens: [{ amount: 5n }], fetch: fetchFn });

    const tx = parseTransaction(raw!);
    expect(tx.to?.toLowerCase()).toBe(MINT_ADDRESS.toLowerCase());
    const abi = parseAbi(["function mint(address to, (address token, uint256 amount)[] tokens, uint128 deadline)"]);
    expect(tx.data!.slice(0, 10)).toBe(toFunctionSelector(abi[0]));
    const { args } = decodeFunctionData({ abi, data: tx.data! });
    expect(args[0].toLowerCase()).toBe(to);
    expect(args[1]).toEqual([{ token: NATIVE_USD_ADDRESS, amount: 5n }]);
    expect(args[2]).toBeGreaterThan(before);
  });
});
