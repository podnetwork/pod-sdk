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
