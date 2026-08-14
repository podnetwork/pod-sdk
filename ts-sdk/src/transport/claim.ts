// Following a withdrawal from pod onto the claim chain (ADR 0033).
//
// Two stages, because the claim hash is not known when the withdrawal resolves:
// ask the pod node for it, then watch the claim chain for the bridge's `Claim`
// event carrying it. Both live here rather than in a consumer because the event
// ABI, the topic filter and the log-range policy are protocol knowledge that
// has to track the bridge contract, not application code.
//
// Stage 1 is REST (`GET /v1/bridge/withdrawals/by-id/{id}`), stage 2 is JSON-RPC
// against the claim chain — the asymmetry is just where each fact lives.
//
// **The claim hash is fetched, never recomputed.** It folds in the pod chain id
// and the bridge version, so a local derivation is a second copy of a
// consensus-critical hash that silently stops matching after a version bump —
// the node serves it so that callers don't (ADR 0033 §4.6). Everything else in
// this module is a consequence of that: it is why stage 1 exists at all.

import type { Address, Hash } from "../types/public.js";
import { tryRpc, type RpcOptions } from "./jsonrpc.js";
import type { WireWithdrawalDetail } from "../types/wire.js";

/**
 * topic0 of `Claim(bytes32 indexed txHash, address token, address mirrorToken,
 * uint256 amount, address indexed to)` — protocol/src/Bridge.sol.
 *
 * A literal rather than a derivation so the read path doesn't pull in an ABI
 * encoder; `claim.test.ts` pins it against viem's `toEventSelector`, so it
 * cannot drift from the signature above without failing a test.
 */
export const CLAIM_TOPIC: Hash =
  "0xa0b99c0fdfc395724d7b81a88a6d74852461f7691371afe2839bb8688475788c";

/** Where a withdrawal has got to on its way to the claim chain. */
export type ClaimStatus =
  /** The certificate is still assembling (below the signature threshold). */
  | { state: "pending" }
  /** Claimable. `claimHash` is the `Claim` event's indexed `txHash`. */
  | { state: "claimable"; claimHash: Hash }
  /** Refused at execution: nothing was debited, so no `Claim` event can ever
   * fire and the user can resubmit under a new id. Terminal. */
  | { state: "refused" };

/**
 * Resolve one withdrawal's claim state from the pod node.
 *
 * The node reports it directly — `status` is always present and is the authority,
 * so nothing here infers terminality from a missing field or an error string. The
 * three states are not interchangeable: `pending` means fewer than N−F signatures
 * are held *on this node* and the caller should ask again, while `refused` means
 * the withdrawal was rejected at execution with nothing debited.
 *
 * A 404 is neither — it means this node has no outcome row yet, which is the
 * normal state for the first moments after submitting, so it reads as `pending`.
 */
export async function fetchClaimStatus(
  restUrl: string,
  withdrawalId: Hash,
  opts?: RpcOptions,
): Promise<ClaimStatus> {
  const doFetch = opts?.fetch ?? fetch;
  try {
    const res = await doFetch(`${restUrl}/bridge/withdrawals/by-id/${withdrawalId}`, {
      headers: { accept: "application/json" },
      signal: opts?.signal,
    });
    // Anything non-OK, 404 included, is "ask again": the row may not be written
    // yet, and no HTTP status carries terminality — only `status` does.
    if (!res.ok) return { state: "pending" };
    const body = (await res.json()) as WireWithdrawalDetail;
    // The proof is read FIRST and believed on its presence alone, whatever
    // `status` says. That ordering is the node's own consumer contract
    // (`WithdrawalDetail`, node/src/rpc/bridge_rest.rs): a node that adds a
    // fourth status while still attaching a certificate must not have that
    // certificate vetoed by a label this client has never heard of. The money
    // is in the proof, not in the word next to it.
    const claimHash = body.proof?.claim_hash;
    if (claimHash) return { state: "claimable", claimHash };
    // Only now may a status be terminal, and only this one. Anything unfamiliar
    // falls through to `pending` — "ask again", never terminal.
    if (body.status === "refused") return { state: "refused" };
    return { state: "pending" };
  } catch {
    // A transport failure is not information about the withdrawal. Guessing
    // `refused` here would tell a user their funds were never taken when they may
    // well have been.
    return { state: "pending" };
  }
}

export interface WaitForClaimOptions extends RpcOptions {
  /** pod REST base, as `PodTradeClient` takes it — `""` for a same-origin
   * browser deployment. Stage 1 lives entirely on this surface; no JSON-RPC. */
  restUrl: string;
  /** Claim-chain JSON-RPC — where the `Claim` event is emitted. */
  claimRpcUrl: string;
  withdrawalId: Hash;
  /** The bridge on the claim chain (`BridgeConfig.sourceContract`). Narrows the
   * log query to one contract; omit only if it isn't known. */
  bridge?: Address;
  /** Give up after this long. Default 10 minutes. */
  timeoutMs?: number;
  /** Default 5s. */
  pollMs?: number;
  /** How far before the current block the log scan starts, covering a relayer
   * that claimed before the watch began. Default 5000.
   *
   * Worth lowering for a watch started as the withdrawal resolves: the claim
   * cannot predate the outcome, so the window is known-empty, and this is both
   * the largest query of the watch and the one public providers cap by range. */
  lookbackBlocks?: number;
}

export type ClaimOutcome =
  /** The funds landed. */
  | { state: "claimed"; claimHash: Hash; transactionHash: Hash }
  /** Refused at execution; nothing was debited and nothing will arrive. */
  | { state: "refused" }
  /** Still outstanding when the timeout or the abort signal hit. Carries the
   * claim hash if stage 1 got that far, so a caller can resume the watch. */
  | { state: "pending"; claimHash?: Hash };

/**
 * Follow one withdrawal to the claim chain: resolve its claim hash, then watch
 * for the `Claim` event carrying it.
 *
 * Matching on the hash rather than the recipient is what makes this exact —
 * `Claim` indexes `to` as well, but that identifies the *user*, so two
 * withdrawals of the same amount to the same address would be indistinguishable.
 *
 * Returns rather than throws on every expected ending, so a caller renders an
 * outcome instead of catching. Pass `signal` to stop the polling when whatever
 * asked for it goes away.
 */
export async function waitForClaim(opts: WaitForClaimOptions): Promise<ClaimOutcome> {
  const { restUrl, claimRpcUrl, withdrawalId, bridge, signal } = opts;
  const pollMs = opts.pollMs ?? 5_000;
  const lookback = opts.lookbackBlocks ?? 5_000;
  const deadline = Date.now() + (opts.timeoutMs ?? 10 * 60_000);
  const rest = { fetch: opts.fetch, signal };

  const live = () => !signal?.aborted && Date.now() < deadline;
  const sleep = () => new Promise<void>((resolve) => {
    const timer = setTimeout(done, pollMs);
    function done() { signal?.removeEventListener("abort", done); clearTimeout(timer); resolve(); }
    signal?.addEventListener("abort", done, { once: true });
  });

  // Anchor the scan window before stage 1, so the range stays bounded however
  // long the certificate takes to assemble. This same reading is the first
  // scan's upper bound, so stage 2 costs no extra round trip to start.
  const tip = await tryRpc<string>(claimRpcUrl, "eth_blockNumber", [], rest);
  if (tip === undefined) return { state: "pending" };
  let head: bigint | undefined = BigInt(tip);
  let fromBlock = head > BigInt(lookback) ? head - BigInt(lookback) : 0n;

  let claimHash: Hash | undefined;
  while (!claimHash && live()) {
    const status = await fetchClaimStatus(restUrl, withdrawalId, rest);
    if (status.state === "refused") return { state: "refused" };
    if (status.state === "claimable") claimHash = status.claimHash;
    else await sleep();
  }
  if (!claimHash) return { state: "pending" };

  while (live()) {
    // The upper bound is pinned BEFORE the scan and named explicitly. With
    // `toBlock: "latest"` the node picks the end itself, and any block mined
    // between that choice and a later head read would be stepped over by the
    // advance below — permanently, since the window only moves forward. On a
    // 250ms-block chain that silently loses the claim a few percent of the time.
    if (head === undefined) {
      const latest = await tryRpc<string>(claimRpcUrl, "eth_blockNumber", [], rest);
      if (latest === undefined) { await sleep(); continue; }
      head = BigInt(latest);
    }
    const toBlock = head;
    head = undefined; // re-read on the next pass; this one is now spent

    if (toBlock >= fromBlock) {
      const filter: Record<string, unknown> = {
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        topics: [CLAIM_TOPIC, claimHash],
      };
      if (bridge) filter.address = bridge;
      const logs = await tryRpc<Array<{ transactionHash: Hash }>>(
        claimRpcUrl, "eth_getLogs", [filter], rest,
      );
      const hit = logs?.[0];
      if (hit) return { state: "claimed", claimHash, transactionHash: hit.transactionHash };

      // Only advance on a scan that actually completed. `tryRpc` maps a 429, a
      // 5xx or "query returned more than 10000 results" to undefined, which is
      // indistinguishable from an empty result — advancing there would skip the
      // range unread, and the lookback window is the one covering a relayer that
      // claimed before this watch began.
      if (logs !== undefined) fromBlock = toBlock + 1n;
    }
    await sleep();
  }
  return { state: "pending", claimHash };
}

export interface WatchClaimsOptions extends RpcOptions {
  /** pod REST base, as `PodTradeClient` takes it. */
  restUrl: string;
  /** Claim-chain JSON-RPC — where the `Claim` event is emitted. */
  claimRpcUrl: string;
  /** The bridge on the claim chain (`BridgeConfig.sourceContract`). */
  bridge?: Address;
  /** Default 5s. */
  pollMs?: number;
  /** Called once per withdrawal, when it reaches a terminal state. Never called
   * for one still outstanding when the watcher stops. */
  onSettled: (withdrawalId: Hash, outcome: ClaimOutcome) => void;
}

export interface ClaimWatcher {
  /**
   * Follow one withdrawal. Ignored if it is already followed, so a caller may
   * re-offer the same id freely. It is NOT ignored for an id that has already
   * settled, because the watcher forgets those — deduplicating across
   * settlement belongs to the caller, which is the only side that knows whether
   * it acted on the outcome.
   *
   * `lookbackBlocks` covers a claim emitted before this id joined. It sets this
   * id's OWN scan floor, and the shared query starts at the oldest floor among
   * outstanding ids — so a range already scanned for others is re-scanned for
   * this one, and no id's window is ever skipped on another's behalf.
   */
  add(withdrawalId: Hash, opts?: { lookbackBlocks?: number }): void;
  /** How many withdrawals are still outstanding. */
  readonly size: number;
  stop(): void;
}

/**
 * Follow many withdrawals on one pair of loops instead of one pair each.
 *
 * The saving is on the claim chain, which is the half that costs: a `Claim`
 * topic filter is an OR set at `topics[1]`, so a single `eth_getLogs` covers
 * every outstanding hash and that query's count stops scaling with the number of
 * withdrawals. Stage 1 still costs one REST read per unresolved id, issued
 * concurrently rather than in series — those go to pod's own node, not to a
 * metered provider, so the thing worth collapsing is the log scan.
 *
 * **Each id carries its own scan floor, and the shared query starts at the
 * oldest of them.** This is the part that is easy to get wrong: a withdrawal
 * still waiting for its certificate has no hash to search for yet, so it
 * contributes nothing to the topic set — but the blocks passing meanwhile are
 * exactly where its `Claim` may land, because a relayer can claim from a
 * certificate this node has not finished assembling. Advancing the floor on the
 * strength of the ids that *do* have hashes would step over that window for
 * good. So a floor is only raised for an id whose hash was actually in the query
 * that covered it.
 *
 * Settlement arrives through `onSettled` rather than a promise per id, so a
 * caller hears about each outcome when it happens rather than when the slowest
 * one does.
 */
export function watchClaims(opts: WatchClaimsOptions): ClaimWatcher {
  const { restUrl, claimRpcUrl, bridge, signal, onSettled } = opts;
  const pollMs = opts.pollMs ?? 5_000;
  const rest = { fetch: opts.fetch, signal };

  interface Entry {
    /** Set once the certificate exists. Lower-cased: it is compared against a
     * topic from a different source, and hex casing is not guaranteed to agree. */
    claimHash?: Hash;
    /** Oldest block this id still needs searched. Pinned on the first tick after
     * `add`, then raised only by a query that actually carried its hash. */
    floor?: bigint;
    lookback: number;
  }

  const pending = new Map<Hash, Entry>();
  let stopped = false;
  let wake: (() => void) | undefined;

  const live = () => !stopped && !signal?.aborted;

  const sleep = () => new Promise<void>((resolve) => {
    const timer = setTimeout(done, pollMs);
    wake = done;
    function done() {
      signal?.removeEventListener("abort", done);
      clearTimeout(timer);
      wake = undefined;
      resolve();
    }
    signal?.addEventListener("abort", done, { once: true });
  });

  /** Terminal for one id. Silent once stopped: `stop()` cannot cancel an
   * in-flight request, and a caller that has torn down its state must not be
   * told about an outcome afterwards — it would announce a claim for an account
   * the user has left, and un-mark an id its own cleanup had just released. */
  const settle = (id: Hash, outcome: ClaimOutcome) => {
    if (!live()) return;
    pending.delete(id);
    onSettled(id, outcome);
  };

  async function tick(): Promise<void> {
    // Stage 1, concurrently: the reads share no state until their results are
    // written back, so in series they would simply add up one RTT at a time.
    const unresolved = [...pending].filter(([, e]) => !e.claimHash);
    const statuses = await Promise.all(
      unresolved.map(([id]) => fetchClaimStatus(restUrl, id, rest)),
    );
    unresolved.forEach(([id, entry], i) => {
      const status = statuses[i]!;
      if (status.state === "refused") settle(id, { state: "refused" });
      else if (status.state === "claimable") entry.claimHash = status.claimHash.toLowerCase() as Hash;
    });
    if (!live() || pending.size === 0) return;

    // The tip is read every tick, even with nothing to search for yet, because
    // it is what pins a newcomer's floor. Deferring that until a hash exists
    // would anchor it at a later block than the one it joined at, losing the
    // window in between — the same mistake as advancing past an unresolved id.
    const head = await tryRpc<string>(claimRpcUrl, "eth_blockNumber", [], rest);
    if (head === undefined) return;
    const toBlock = BigInt(head);
    for (const entry of pending.values()) {
      if (entry.floor === undefined) {
        const back = BigInt(entry.lookback);
        entry.floor = toBlock > back ? toBlock - back : 0n;
      }
    }

    const hashes = [...pending.values()].map((e) => e.claimHash).filter((h): h is Hash => !!h);
    if (hashes.length === 0) return; // nothing to look for; floors are pinned

    let fromBlock = toBlock;
    for (const entry of pending.values()) {
      if (entry.floor !== undefined && entry.floor < fromBlock) fromBlock = entry.floor;
    }
    if (toBlock < fromBlock) return;

    const filter: Record<string, unknown> = {
      fromBlock: `0x${fromBlock.toString(16)}`,
      toBlock: `0x${toBlock.toString(16)}`,
      // An array at `topics[1]` is an OR over claim hashes — the whole reason
      // one query can serve every outstanding withdrawal.
      topics: [CLAIM_TOPIC, hashes],
    };
    if (bridge) filter.address = bridge;

    const logs = await tryRpc<Array<{ transactionHash: Hash; topics: Hash[] }>>(
      claimRpcUrl, "eth_getLogs", [filter], rest,
    );
    // Undefined is a failed query, not an empty range, so no floor may move.
    if (logs === undefined) return;

    for (const log of logs) {
      const claimHash = log.topics[1]?.toLowerCase() as Hash | undefined;
      if (!claimHash) continue;
      for (const [id, entry] of [...pending]) {
        if (entry.claimHash === claimHash) {
          settle(id, { state: "claimed", claimHash, transactionHash: log.transactionHash });
        }
      }
    }
    // Raise the floor ONLY for ids whose hash this query carried. One that is
    // still waiting on its certificate keeps its original floor, so the blocks
    // that passed while it waited are searched once its hash appears.
    const searched = new Set(hashes);
    for (const entry of pending.values()) {
      if (entry.claimHash && searched.has(entry.claimHash)) entry.floor = toBlock + 1n;
    }
  }

  async function run(): Promise<void> {
    while (live()) {
      if (pending.size > 0) await tick();
      await sleep();
    }
  }

  void run();

  return {
    add(withdrawalId, addOpts) {
      if (stopped || pending.has(withdrawalId)) return;
      pending.set(withdrawalId, { lookback: addOpts?.lookbackBlocks ?? 0 });
      wake?.(); // pin its floor now rather than after the current sleep
    },
    get size() {
      return pending.size;
    },
    stop() {
      stopped = true;
      wake?.();
    },
  };
}
