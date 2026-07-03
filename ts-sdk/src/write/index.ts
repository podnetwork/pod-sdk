// Write helpers: build unsigned CLOB transactions and derive order ids. These
// are pure encoding — no wallet, no key, no nonce ownership. The consumer signs
// + broadcasts the returned request with whatever wallet it has
// (walletClient.sendTransaction / eth_sendTransaction / Privy).
//
// Uses viem only as an ABI/keccak encoder (not for signing), and lives in this
// separate `/write` entry so read-only consumers never bundle it.

import { decodeAbiParameters, encodeAbiParameters, encodeFunctionData, keccak256, parseAbi } from "viem";
import type { Address, Hash, Hex, MarketId } from "../types/public.js";

/** The CLOB precompile (chain id 1293 / 0x50d). */
export const CLOB_ADDRESS: Address = "0x50d0000000000000000000000000000000000002";

const CLOB_ABI = parseAbi([
  "function submitOrder(bytes32 orderbookId, int256 size, uint256 price, uint8 orderType, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc)",
  "function cancel(bytes32 orderbookId, bytes32 canceledOrder, uint128 deadline)",
  "function update(bytes32 orderbookId, bytes32 updatedOrder, uint256 newSize, uint256 newPrice, address token, uint128 deadline)",
  // TriggerType { TakeProfit=0, StopLoss=1 } ; TriggerGrouping { None=0, Position=1 }
  "function submitTrigger(bytes32 orderbookId, int256 size, uint256 limitPrice, uint256 triggerPrice, uint8 triggerType, uint8 grouping, uint128 deadline, uint128 ttl, bool reduceOnly, bool ioc)",
  "function cancelTrigger(bytes32 orderbookId, bytes32 triggerOrder, uint128 deadline)",
  "function updateTrigger(bytes32 orderbookId, bytes32 triggerOrder, int256 newSize, uint256 newLimitPrice, uint256 newTriggerPrice, uint128 deadline)",
  "function submitBatch(bytes[] inner)",
]);

/** ~10 years in microseconds — default far-future expiry for resting orders. */
const FAR_US = 10n * 365n * 24n * 3600n * 1_000_000n;

export interface SubmitOrderParams {
  orderbookId: MarketId;
  side: "buy" | "sell"; // buy/long → +size, sell/short → −size
  orderType: "limit" | "market";
  price: bigint; // 1e18-scaled
  size: bigint; // 1e18-scaled magnitude (sign is applied from `side`)
  /**
   * Market `tick_precision`. When given, `price` is floored to a multiple of it
   * — the CLOB rejects prices that aren't tick-aligned (e.g. a raw oracle mark
   * like 49999.99999999999). Pass `market.tickPrecision`.
   */
  tickPrecision?: bigint;
  /**
   * Market auction interval in microseconds (`market.auctionIntervalMs * 1000`).
   * The CLOB requires `deadline` to be a multiple of it ("Deadline is not aligned
   * to auction interval"); when given, deadline & ttl are floored to it.
   */
  auctionIntervalUs?: number;
  reduceOnly?: boolean;
  ioc?: boolean;
  deadline?: number; // ms; default far future
  ttl?: number; // ms; default far future
}

/** Floor a price to a multiple of the tick. */
export function alignPrice(price: bigint, tick: bigint): bigint {
  return tick > 0n ? (price / tick) * tick : price;
}

/** Floor a microsecond timestamp to a multiple of the auction interval. */
export function alignDeadline(us: bigint, intervalUs: bigint): bigint {
  return intervalUs > 0n ? (us / intervalUs) * intervalUs : us;
}

/** An unsigned transaction request — hand to `walletClient.sendTransaction`. */
export interface PodTxRequest {
  to: Address;
  data: Hex;
  value: bigint;
  type: "eip1559";
  maxPriorityFeePerGas: bigint;
  gas: bigint;
  // maxFeePerGas is supplied by the caller (pod base fee, from eth_maxFeePerGas).
}

function us(ms: number | undefined, fallback: bigint): bigint {
  return ms === undefined ? fallback : BigInt(Math.trunc(ms)) * 1000n;
}

export function buildSubmitOrder(p: SubmitOrderParams): PodTxRequest {
  const nowUs = BigInt(Date.now()) * 1000n;
  const signedSize = p.side === "sell" ? -p.size : p.size;
  const price = p.tickPrecision ? alignPrice(p.price, p.tickPrecision) : p.price;
  const interval = p.auctionIntervalUs ? BigInt(p.auctionIntervalUs) : 0n;
  const deadline = alignDeadline(us(p.deadline, nowUs + FAR_US), interval);
  const ttl = alignDeadline(us(p.ttl, nowUs + FAR_US + 30n * 24n * 3600n * 1_000_000n), interval);
  const data = encodeFunctionData({
    abi: CLOB_ABI,
    functionName: "submitOrder",
    args: [
      p.orderbookId,
      signedSize,
      price,
      p.orderType === "market" ? 1 : 0, // OrderType { Limit=0, Market=1 }
      deadline,
      ttl,
      p.reduceOnly ?? false,
      p.ioc ?? false,
    ],
  }) as Hex;
  return { to: CLOB_ADDRESS, data, value: 0n, type: "eip1559", maxPriorityFeePerGas: 0n, gas: 1_000_000n };
}

export function buildCancelOrder(
  orderbookId: MarketId,
  orderId: Hash,
  opts?: { deadline?: number; auctionIntervalUs?: number },
): PodTxRequest {
  const nowUs = BigInt(Date.now()) * 1000n;
  const interval = opts?.auctionIntervalUs ? BigInt(opts.auctionIntervalUs) : 0n;
  const deadline = alignDeadline(us(opts?.deadline, nowUs + FAR_US), interval);
  const data = encodeFunctionData({
    abi: CLOB_ABI,
    functionName: "cancel",
    args: [orderbookId, orderId, deadline],
  }) as Hex;
  return { to: CLOB_ADDRESS, data, value: 0n, type: "eip1559", maxPriorityFeePerGas: 0n, gas: 1_000_000n };
}

// --- broadcasting ---
//
// Signing stays with the consumer's wallet (viem / Privy / MetaMask). What IS
// pod-specific — and worth centralizing — is how a reverted CLOB tx surfaces:
// the CLOB validates orders only on execution, so a high-level send returns
// "execution reverted for an unknown reason" with the revert data dropped. We
// broadcast the already-signed tx with a raw eth_sendRawTransaction (which
// preserves the Solidity `Error(string)` payload) and decode the real message.

/** Solidity `Error(string)` selector — `bytes4(keccak256("Error(string)"))`. */
const ERROR_SELECTOR = "0x08c379a0";

/** A reverted pod transaction, carrying the decoded CLOB reason. */
export class PodTxRevertError extends Error {
  constructor(public reason: string, public data?: string) {
    super(reason);
    this.name = "PodTxRevertError";
  }
}

/**
 * Decode a Solidity `Error(string)` revert payload into its message (e.g.
 * "Deadline is not aligned to auction interval"). Returns undefined when `data`
 * isn't an `Error(string)` payload — use this directly if you broadcast through
 * your own provider and just want to translate the revert data.
 */
export function decodeRevertReason(data: string | null | undefined): string | undefined {
  if (!data || !data.startsWith(ERROR_SELECTOR)) return undefined;
  try {
    return decodeAbiParameters([{ type: "string" }], `0x${data.slice(10)}` as Hex)[0];
  } catch {
    return undefined;
  }
}

/**
 * Broadcast a SIGNED, serialized transaction via raw `eth_sendRawTransaction`
 * and return its hash, throwing a {@link PodTxRevertError} with the decoded CLOB
 * reason on revert. Transport-only — the consumer signs with its own wallet
 * (`walletClient.signTransaction(...)`), then hands the serialized tx here.
 */
export async function sendRawTransaction(
  rpcUrl: string,
  signedTx: Hex,
  opts?: { fetch?: typeof fetch },
): Promise<Hash> {
  const doFetch = opts?.fetch ?? fetch;
  const res = await doFetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: [signedTx] }),
  });
  const json = (await res.json()) as { result?: Hash; error?: { message?: string; data?: string } };
  if (json.error) {
    const reason = decodeRevertReason(json.error.data) ?? json.error.message ?? "transaction failed";
    throw new PodTxRevertError(reason, json.error.data);
  }
  return json.result!;
}

export interface UpdateOrderParams {
  orderbookId: MarketId;
  /** The resting order's id (`Order.id`) — modified in place, keeps the same id. */
  orderId: Hash;
  /** New price, 1e18-scaled. Floored to `tickPrecision` when given. */
  price: bigint;
  /**
   * New size MAGNITUDE, 1e18-scaled. The side is unchanged — the engine reuses
   * the resting order's side — so the sign is ignored. Must be non-zero.
   */
  size: bigint;
  /**
   * Collateral/quote token. The engine derives the real side & token from the
   * resting order, so this is effectively informational; pass `market.quote.address`
   * (the native USD address for perps).
   */
  token: Address;
  tickPrecision?: bigint;
  auctionIntervalUs?: number;
  deadline?: number; // ms; default far future
}

/**
 * Amend a resting order's price and/or size in place via the CLOB's native
 * `update` (no cancel+resubmit, so the order keeps its id and queue identity).
 * Aligns price to the tick and deadline to the auction interval, like
 * {@link buildSubmitOrder}.
 */
export function buildUpdateOrder(p: UpdateOrderParams): PodTxRequest {
  const nowUs = BigInt(Date.now()) * 1000n;
  const price = p.tickPrecision ? alignPrice(p.price, p.tickPrecision) : p.price;
  const size = p.size < 0n ? -p.size : p.size; // contract takes an unsigned magnitude
  const interval = p.auctionIntervalUs ? BigInt(p.auctionIntervalUs) : 0n;
  const deadline = alignDeadline(us(p.deadline, nowUs + FAR_US), interval);
  const data = encodeFunctionData({
    abi: CLOB_ABI,
    functionName: "update",
    args: [p.orderbookId, p.orderId, size, price, p.token, deadline],
  }) as Hex;
  return { to: CLOB_ADDRESS, data, value: 0n, type: "eip1559", maxPriorityFeePerGas: 0n, gas: 1_000_000n };
}

// --- TP/SL triggers (perp-only) ---------------------------------------------
//
// A trigger is an *armed* limit order: when the pair's mark price crosses
// `triggerPrice` in the direction implied by `triggerType` and the sign of the
// size, the venue emits a regular limit order. To attach a TP/SL to a position,
// the trigger's side is the CLOSING side (opposite the position), `reduceOnly`,
// and `grouping: "position"` so it's auto-cancelled when the position closes.
//
// Direction matrix (is_buy = size > 0):
//   buy  + take_profit → fires when mark <= triggerPrice
//   buy  + stop_loss   → fires when mark >= triggerPrice
//   sell + take_profit → fires when mark >= triggerPrice
//   sell + stop_loss   → fires when mark <= triggerPrice

/** Triggers expire at most this long after their deadline (CLOB TRIGGER_MAX_TTL). */
const TRIGGER_TTL_US = 29n * 24n * 3600n * 1_000_000n; // 29d, just under the 30d cap

export interface SubmitTriggerParams {
  orderbookId: MarketId;
  /** Side of the order that fires: buy → +size, sell → −size. */
  side: "buy" | "sell";
  size: bigint; // magnitude, 1e18-scaled (sign applied from `side`)
  triggerType: "take_profit" | "stop_loss";
  /** Mark-price level that arms the fire, 1e18-scaled. Floored to the tick. */
  triggerPrice: bigint;
  /** Limit price of the fired order; defaults to `triggerPrice`. Floored to the tick. */
  limitPrice?: bigint;
  /** "position" (default) auto-cancels with the position; "none" is standalone. */
  grouping?: "none" | "position";
  reduceOnly?: boolean; // default true
  ioc?: boolean;
  tickPrecision?: bigint;
  auctionIntervalUs?: number;
  deadline?: number; // ms; default far future
  /** Armed lifetime as a duration in ms (capped at ~30d by the CLOB); default 29d. */
  ttlMs?: number;
}

export function buildSubmitTrigger(p: SubmitTriggerParams): PodTxRequest {
  const nowUs = BigInt(Date.now()) * 1000n;
  const signedSize = p.side === "sell" ? -p.size : p.size;
  const align = (v: bigint) => (p.tickPrecision ? alignPrice(v, p.tickPrecision) : v);
  const triggerPrice = align(p.triggerPrice);
  const limitPrice = align(p.limitPrice ?? p.triggerPrice);
  const interval = p.auctionIntervalUs ? BigInt(p.auctionIntervalUs) : 0n;
  const deadline = alignDeadline(us(p.deadline, nowUs + FAR_US), interval);
  // ttl as a RELATIVE duration (< deadline ⇒ the CLOB reads it relative to the deadline).
  const ttl = p.ttlMs !== undefined ? BigInt(Math.trunc(p.ttlMs)) * 1000n : TRIGGER_TTL_US;
  const data = encodeFunctionData({
    abi: CLOB_ABI,
    functionName: "submitTrigger",
    args: [
      p.orderbookId,
      signedSize,
      limitPrice,
      triggerPrice,
      p.triggerType === "stop_loss" ? 1 : 0, // TriggerType
      (p.grouping ?? "position") === "position" ? 1 : 0, // TriggerGrouping
      deadline,
      ttl,
      p.reduceOnly ?? true,
      p.ioc ?? false,
    ],
  }) as Hex;
  return { to: CLOB_ADDRESS, data, value: 0n, type: "eip1559", maxPriorityFeePerGas: 0n, gas: 1_000_000n };
}

export function buildCancelTrigger(
  orderbookId: MarketId,
  triggerOrderId: Hash,
  opts?: { deadline?: number; auctionIntervalUs?: number },
): PodTxRequest {
  const nowUs = BigInt(Date.now()) * 1000n;
  const interval = opts?.auctionIntervalUs ? BigInt(opts.auctionIntervalUs) : 0n;
  const deadline = alignDeadline(us(opts?.deadline, nowUs + FAR_US), interval);
  const data = encodeFunctionData({
    abi: CLOB_ABI,
    functionName: "cancelTrigger",
    args: [orderbookId, triggerOrderId, deadline],
  }) as Hex;
  return { to: CLOB_ADDRESS, data, value: 0n, type: "eip1559", maxPriorityFeePerGas: 0n, gas: 1_000_000n };
}

export interface UpdateTriggerParams {
  orderbookId: MarketId;
  triggerOrderId: Hash;
  side: "buy" | "sell"; // sign of newSize; grouping can't change via update
  size: bigint; // magnitude
  triggerPrice: bigint;
  limitPrice?: bigint;
  tickPrecision?: bigint;
  auctionIntervalUs?: number;
  deadline?: number;
}

export function buildUpdateTrigger(p: UpdateTriggerParams): PodTxRequest {
  const nowUs = BigInt(Date.now()) * 1000n;
  const signedSize = p.side === "sell" ? -p.size : p.size;
  const align = (v: bigint) => (p.tickPrecision ? alignPrice(v, p.tickPrecision) : v);
  const interval = p.auctionIntervalUs ? BigInt(p.auctionIntervalUs) : 0n;
  const deadline = alignDeadline(us(p.deadline, nowUs + FAR_US), interval);
  const data = encodeFunctionData({
    abi: CLOB_ABI,
    functionName: "updateTrigger",
    args: [p.orderbookId, p.triggerOrderId, signedSize, align(p.limitPrice ?? p.triggerPrice), align(p.triggerPrice), deadline],
  }) as Hex;
  return { to: CLOB_ADDRESS, data, value: 0n, type: "eip1559", maxPriorityFeePerGas: 0n, gas: 1_000_000n };
}

// --- batching (submitBatch) -------------------------------------------------
//
// `submitBatch(bytes[] inner)` carries several single-intent calls in ONE signed
// tx. Each `inner[i]` is the ABI-encoded calldata of an existing intent
// (submitOrder, submitTrigger, cancel, …); its `sequence` (the index in `inner`)
// feeds `OrderId::new(signer, nonce, sequence)`. The CLOB requires every
// deadline-bearing leg to share ONE deadline — build the legs with the same
// `deadline` (see `buildOrderWithTriggers`, which does this for you).

/** ~10 years in ms — default far-future deadline shared by batched legs. */
const FAR_MS = 10 * 365 * 24 * 3600 * 1000;

/** Scale a 1e18 size by a 0..1 fraction (e.g. close 50% of a position). */
function scaleSize(size: bigint, fraction: number): bigint {
  const f = Math.max(0, Math.min(1, fraction));
  return (size * BigInt(Math.round(f * 1_000_000))) / 1_000_000n;
}

/** Wrap already-built legs into one `submitBatch` tx. Pass leg requests (their
 * `data` is used) or raw calldata. Legs must share a deadline (the CLOB enforces
 * it). Gas scales with the leg count. */
export function buildSubmitBatch(
  legs: Array<PodTxRequest | Hex>,
  opts?: { gas?: bigint },
): PodTxRequest {
  const inner = legs.map((l) => (typeof l === "string" ? l : l.data));
  const data = encodeFunctionData({
    abi: CLOB_ABI,
    functionName: "submitBatch",
    args: [inner],
  }) as Hex;
  return {
    to: CLOB_ADDRESS,
    data,
    value: 0n,
    type: "eip1559",
    maxPriorityFeePerGas: 0n,
    gas: opts?.gas ?? BigInt(Math.max(1, inner.length)) * 1_000_000n,
  };
}

export interface OrderTrigger {
  /** Mark-price level that arms the fire (1e18). Floored to the tick. */
  triggerPrice: bigint;
  /** Fired limit price; defaults to `triggerPrice`. Floored to the tick. */
  limitPrice?: bigint;
  /** Fraction of the entry size to close, 0..1 (default 1 = whole position). */
  sizeFraction?: number;
}

export interface OrderWithTriggersParams {
  orderbookId: MarketId;
  /** Entry side: buy → long, sell → short. */
  side: "buy" | "sell";
  orderType: "limit" | "market";
  price: bigint; // entry price, 1e18
  size: bigint; // entry size magnitude, 1e18
  takeProfit?: OrderTrigger;
  stopLoss?: OrderTrigger;
  tickPrecision?: bigint;
  auctionIntervalUs?: number;
  reduceOnly?: boolean; // entry reduceOnly (rare); triggers are always reduceOnly
  ioc?: boolean;
  deadline?: number; // ms; shared by every leg (default far future)
  orderTtl?: number; // ms
  triggerTtlMs?: number; // ms; armed lifetime (capped ~30d)
}

/**
 * Build ONE transaction that places an entry order and arms its TP/SL together.
 * With either trigger present it batches `submitOrder` + `submitTrigger`(s) via
 * `submitBatch` under a shared deadline; with neither it's a plain `submitOrder`.
 *
 * Triggers close the entry position: opposite side, `reduceOnly`,
 * `grouping: "position"` (so a partial fill — and the eventual close — keep the
 * triggers consistent), size = entry size × `sizeFraction`.
 */
export function buildOrderWithTriggers(p: OrderWithTriggersParams): PodTxRequest {
  const deadline = p.deadline ?? Date.now() + FAR_MS;
  const order = buildSubmitOrder({
    orderbookId: p.orderbookId,
    side: p.side,
    orderType: p.orderType,
    price: p.price,
    size: p.size,
    tickPrecision: p.tickPrecision,
    auctionIntervalUs: p.auctionIntervalUs,
    reduceOnly: p.reduceOnly,
    ioc: p.ioc,
    deadline,
    ttl: p.orderTtl,
  });
  const closeSide: "buy" | "sell" = p.side === "buy" ? "sell" : "buy";
  const trigLeg = (t: OrderTrigger, triggerType: "take_profit" | "stop_loss") =>
    buildSubmitTrigger({
      orderbookId: p.orderbookId,
      side: closeSide,
      size: scaleSize(p.size, t.sizeFraction ?? 1),
      triggerType,
      triggerPrice: t.triggerPrice,
      limitPrice: t.limitPrice,
      grouping: "position",
      reduceOnly: true,
      tickPrecision: p.tickPrecision,
      auctionIntervalUs: p.auctionIntervalUs,
      deadline,
      ttlMs: p.triggerTtlMs,
    });
  const legs: PodTxRequest[] = [order];
  if (p.takeProfit) legs.push(trigLeg(p.takeProfit, "take_profit"));
  if (p.stopLoss) legs.push(trigLeg(p.stopLoss, "stop_loss"));
  return legs.length === 1 ? order : buildSubmitBatch(legs);
}

export interface ClosePositionParams {
  orderbookId: MarketId;
  /** The position's current side (long → close with a sell; short → buy). */
  side: "long" | "short";
  /** Position size magnitude to close (1e18). */
  size: bigint;
  /** Current mark price (1e18) — the protective price is derived from it. */
  price: bigint;
  /** Slippage bound in basis points for the market close. Default 500 (5%). */
  slippageBps?: number;
  tickPrecision?: bigint;
  auctionIntervalUs?: number;
  deadline?: number; // ms; pass a shared value when batching closes
}

/**
 * Close (flatten) a perp position: a reduce-only **market** order on the
 * opposite side for the full size. A market order's `price` is a slippage
 * bound, so it's set to mark ∓ `slippageBps` (sell accepts lower, buy pays
 * higher) to guarantee it crosses and fills. `reduceOnly` guarantees it only
 * shrinks the position, never flips it. Batch several with
 * {@link buildSubmitBatch} (shared `deadline`) to close everything in one tx.
 */
export function buildClosePosition(p: ClosePositionParams): PodTxRequest {
  const closeSide = p.side === "long" ? "sell" : "buy";
  const bps = BigInt(p.slippageBps ?? 500);
  const SCALE = 10_000n;
  const mult = closeSide === "buy" ? SCALE + bps : SCALE - bps;
  const price = (p.price * mult) / SCALE; // protective bound; tick-aligned in build
  return buildSubmitOrder({
    orderbookId: p.orderbookId,
    side: closeSide,
    orderType: "market",
    price,
    size: p.size < 0n ? -p.size : p.size,
    reduceOnly: true,
    tickPrecision: p.tickPrecision,
    auctionIntervalUs: p.auctionIntervalUs,
    deadline: p.deadline,
  });
}

/** A mined transaction receipt (the fields a consumer typically needs). */
export interface TxReceipt {
  /** `success` when the tx executed (status `0x1`); `reverted` on `0x0`. */
  status: "success" | "reverted";
  transactionHash: Hash;
  blockNumber: bigint;
  gasUsed: bigint;
}

/**
 * Poll `eth_getTransactionReceipt` until the tx is mined, then report whether it
 * executed or reverted. A hash from {@link sendRawTransaction} only means the
 * node accepted the tx into its pool — it is NOT yet confirmed. Await this to
 * know the on-chain outcome. Throws on timeout. Like the rest of this module
 * it's transport-only (raw JSON-RPC), so it needs no viem client.
 */
export async function waitForReceipt(
  rpcUrl: string,
  hash: Hash,
  opts?: { fetch?: typeof fetch; timeoutMs?: number; pollMs?: number },
): Promise<TxReceipt> {
  const doFetch = opts?.fetch ?? fetch;
  const timeoutMs = opts?.timeoutMs ?? 30_000;
  const pollMs = opts?.pollMs ?? 250;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const res = await doFetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionReceipt", params: [hash] }),
    });
    const json = (await res.json()) as {
      result?: { status: string; transactionHash: Hash; blockNumber: string; gasUsed: string } | null;
    };
    const r = json.result;
    if (r) {
      return {
        status: r.status === "0x1" ? "success" : "reverted",
        transactionHash: r.transactionHash,
        blockNumber: BigInt(r.blockNumber),
        gasUsed: BigInt(r.gasUsed),
      };
    }
    if (Date.now() > deadline) throw new Error(`timed out waiting for receipt ${hash}`);
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

/**
 * Deterministic order id: `keccak256(abi.encode(signer, nonce, sequence))`,
 * matching the engine (`trading/src/lib.rs`). `sequence` is the 0-based index
 * of the intent within a `submitBatch` (0 for a single-intent tx). Needs the
 * nonce, so it's only known up-front in managed mode; in advisory mode reconcile
 * by `tx_hash` from the `pod_orders` stream instead.
 */
export function deriveOrderId(signer: Address, nonce: number, sequence = 0): Hash {
  return keccak256(
    encodeAbiParameters(
      [{ type: "address" }, { type: "uint64" }, { type: "uint32" }],
      [signer, BigInt(nonce), sequence],
    ),
  ) as Hash;
}
