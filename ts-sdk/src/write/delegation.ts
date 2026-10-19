// Ephemeral-key delegation, mirroring node/src/delegation/mod.rs (stateless):
// the master wallet signs one EIP-712 `DelegationAuth { delegate, validUntil }`
// authorizing a freshly generated ephemeral key; every CLOB tx is then wrapped
// in the gas-exempt `delegated(master, validUntil, signature, inner)` envelope
// and signed by that key. No on-chain registration — the cert rides in each tx.
//
// SECURITY INVARIANT: the ephemeral private key exists ONLY inside the closure
// created by createDelegatedWallet() — it is never exported, never persisted,
// never attached to any object that leaves this module. The only capability a
// DelegatedWallet exposes is submit(); "logging out" is dropping the object.
// Keep it that way.

import {
  BaseError, RpcRequestError, createWalletClient, defineChain, encodeFunctionData, http, keccak256, parseAbi, recoverTypedDataAddress,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address, Hash, Hex } from "../types/public.js";
import { PodRpcError, rpc } from "../transport/jsonrpc.js";
import {
  CLOB_ADDRESS, PodTxRevertError, sendRawTransaction, waitForReceipt, type PodTxRequest,
} from "./index.js";

/** EIP-712 payload the master signs (domain "pod delegation" v1). */
export function delegationTypedData(delegate: Address, validUntil: bigint, chainId: number) {
  return {
    domain: { name: "pod delegation", version: "1", chainId },
    types: { DelegationAuth: [
      { name: "delegate", type: "address" },
      { name: "validUntil", type: "uint64" },
    ] },
    primaryType: "DelegationAuth",
    message: { delegate, validUntil },
  } as const;
}

export type DelegationTypedData = ReturnType<typeof delegationTypedData>;

const DELEGATED_ABI = parseAbi([
  "function delegated(address master, uint64 validUntil, bytes signature, bytes inner)",
]);

// Past nonce, future nonce or account pending: a pre-validation rejection that a fresh nonce can fix.
const RETRYABLE_REJECTION_CODE = 996;
const SUBMIT_RETRY_MS = 250;
const SUBMIT_GIVE_UP_MS = 10_000;
// A node that never attests holds a send for its whole wait; the rest of the budget is for the receipt poll.
const SEND_ATTEMPT_MS = SUBMIT_GIVE_UP_MS / 2;

/** `submit` could not tell whether its transaction reached the chain. */
export class PodDeliveryUnknownError extends Error {
  constructor(readonly txHash: Hash, options?: { cause?: unknown }) {
    super(`submit: delivery unknown for ${txHash} after ${SUBMIT_GIVE_UP_MS / 1000}s`, options);
    this.name = "PodDeliveryUnknownError";
  }
}

/** A trading session: public cert facts + the one capability, submit(). */
export interface DelegatedWallet {
  readonly master: Address;
  readonly delegate: Address;
  /** Cert expiry in MICROSECONDS — must cover every inner intent deadline. */
  readonly validUntil: bigint;
  /** Wrap `tx` in the delegated envelope, sign with the ephemeral key, and
   * broadcast (raw send, CLOB revert reasons decoded). Returns the tx hash. */
  submit(tx: PodTxRequest): Promise<Hash>;
}

export interface CreateDelegatedWalletParams {
  master: Address;
  chainId: number;
  /** Node JSON-RPC HTTP endpoint (nonce, gas price, broadcast). */
  rpcUrl: string;
  /** The master wallet's typed-data prompt (the one signature of the flow). */
  signTypedData: (td: DelegationTypedData) => Promise<Hex>;
  /** Delegation lifetime in ms; must cover every intent deadline issued during it. */
  ttlMs: number;
  fetch?: typeof fetch;
}

/**
 * Create a session: generate an ephemeral key, have the master sign the
 * delegation via `signTypedData`, and verify the returned signature actually
 * recovers to `master` before trusting it (catches a wrong active account in
 * the wallet at login instead of a confusing node revert later).
 */
export async function createDelegatedWallet(p: CreateDelegatedWalletParams): Promise<DelegatedWallet> {
  const account = privateKeyToAccount(generatePrivateKey());
  const validUntil = (BigInt(Date.now()) + BigInt(p.ttlMs)) * 1000n; // µs
  const typedData = delegationTypedData(account.address, validUntil, p.chainId);
  const signature = await p.signTypedData(typedData);
  const recovered = await recoverTypedDataAddress({ ...typedData, signature });
  if (recovered.toLowerCase() !== p.master.toLowerCase()) {
    throw new Error(`delegation signed by ${recovered}, not ${p.master} — is the right account active?`);
  }

  const chain = defineChain({
    id: p.chainId, name: `pod-${p.chainId}`,
    nativeCurrency: { name: "pETH", symbol: "pETH", decimals: 18 },
    rpcUrls: { default: { http: [p.rpcUrl] } },
  });
  const client = createWalletClient({ account, chain, transport: http(p.rpcUrl, { fetchFn: p.fetch }) });
  const doFetch = p.fetch ?? fetch;

  const submit = async (tx: PodTxRequest): Promise<Hash> => {
    if (tx.to.toLowerCase() !== CLOB_ADDRESS) {
      throw new Error(`delegation covers CLOB calls only, not ${tx.to} — sign this with the master wallet`);
    }
    // Refuse to sign with a cert that can't cover a fresh intent deadline
    // (~15 min out) — the node would reject the tx as expired anyway.
    if (validUntil <= (BigInt(Date.now()) + 20n * 60_000n) * 1000n) {
      throw new Error("delegation expired — re-authorize the wallet");
    }
    const data = encodeFunctionData({
      abi: DELEGATED_ABI,
      functionName: "delegated",
      args: [p.master, validUntil, signature, tx.data],
    });
    const sign = async () => {
      const maxFeePerGas = BigInt(await rpc<string>(p.rpcUrl, "eth_gasPrice", [], { fetch: doFetch }));
      const prepared = await client.prepareTransactionRequest({ ...tx, data, account, chain, maxFeePerGas });
      return client.signTransaction(prepared as never);
    };
    const giveUpAt = Date.now() + SUBMIT_GIVE_UP_MS;
    let serialized: Hex | undefined;
    // Set once an attempt may have reached a node; from then on the bytes are never re-signed.
    let maybeDelivered: Hash | undefined;
    let err: unknown;
    for (let attempt = 0; ; attempt++) {
      let sending = false;
      try {
        serialized ??= await sign();
        sending = true;
        // Not AbortSignal.timeout: its clock is not the one setTimeout runs on, which fake timers replace.
        const ctl = new AbortController();
        const stall = setTimeout(() => ctl.abort(), Math.max(1, Math.min(SEND_ATTEMPT_MS, giveUpAt - Date.now())));
        try {
          return await sendRawTransaction(p.rpcUrl, serialized, { fetch: doFetch, signal: ctl.signal });
        } finally {
          clearTimeout(stall);
        }
      } catch (e) {
        err = e;
      }
      if (!sending && (err instanceof PodRpcError
        || (err instanceof BaseError && err.walk((c) => c instanceof RpcRequestError) !== null))) throw err;
      if (err instanceof PodTxRevertError) {
        if (err.code !== RETRYABLE_REJECTION_CODE) throw err;
        if (maybeDelivered) break;
        // Rejected by the node's pre-validation, so nothing was broadcast.
        serialized = undefined;
      } else if (sending) {
        maybeDelivered = keccak256(serialized!);
      }
      const backoff = Math.min(1_000, SUBMIT_RETRY_MS * 2 ** attempt);
      if (Date.now() + backoff > giveUpAt) {
        if (maybeDelivered) break;
        throw new Error(`submit gave up after ${SUBMIT_GIVE_UP_MS / 1000}s: ${(err as Error).message}`, { cause: err });
      }
      await new Promise((r) => setTimeout(r, backoff));
    }
    const hash = maybeDelivered;
    try {
      await waitForReceipt(p.rpcUrl, hash, {
        fetch: doFetch, pollMs: SUBMIT_RETRY_MS, timeoutMs: Math.max(0, giveUpAt - Date.now()),
      });
      return hash;
    } catch {
      throw new PodDeliveryUnknownError(hash, { cause: err });
    }
  };

  return Object.freeze({ master: p.master, delegate: account.address, validUntil, submit });
}
