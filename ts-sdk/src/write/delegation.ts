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

import { createWalletClient, defineChain, encodeFunctionData, http, parseAbi, recoverTypedDataAddress } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Address, Hash, Hex } from "../types/public.js";
import { sendRawTransaction, type PodTxRequest } from "./index.js";

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
  const client = createWalletClient({ account, chain, transport: http(p.rpcUrl) });
  const doFetch = p.fetch ?? fetch;

  const submit = async (tx: PodTxRequest): Promise<Hash> => {
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
    const maxFeePerGas = BigInt(await rpc(p.rpcUrl, doFetch, "eth_gasPrice"));
    const prepared = await client.prepareTransactionRequest({ ...tx, data, account, chain, maxFeePerGas });
    const serialized = await client.signTransaction(prepared as never);
    return sendRawTransaction(p.rpcUrl, serialized, { fetch: doFetch });
  };

  return Object.freeze({ master: p.master, delegate: account.address, validUntil, submit });
}

async function rpc(rpcUrl: string, doFetch: typeof fetch, method: string): Promise<string> {
  const res = await doFetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }),
  });
  const json = (await res.json()) as { result?: string; error?: { message?: string } };
  if (json.error || json.result === undefined) throw new Error(json.error?.message ?? `${method} failed`);
  return json.result;
}
