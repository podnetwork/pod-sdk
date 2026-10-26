// Terminal withdrawal outcomes for one account (ADR 0033 §6): seeded and
// gap-filled over `GET /v2/bridge/withdrawals/{account}`, kept live by the
// `pod_withdrawals` subscription.
//
// The two surfaces serve the identical shape, so a backfilled outcome is
// indistinguishable from one that arrived live — which is what lets a reconnect
// be a plain "fetch the gap" rather than a separate code path.
//
// Outcomes are terminal and immutable: an id appears once and never changes, so
// merging is last-write-wins on the id with no reconciliation.

import type { Address, Withdrawal } from "../types/public.js";
import type { WireWithdrawal } from "../types/wire.js";
import { decodeWithdrawal } from "../codec/decode.js";
import type { ResourceSource } from "../stores/resource.js";
import type { Subscription } from "../transport/ws.js";
import { MAX_SUB_RETRIES, readAtLeast, subBackoffMs, type SyncContext } from "./sources.js";

/** Page size for the backfill. The server caps at 1000 and defaults to 500. */
const PAGE_LIMIT = 500;

/** Pages to walk in one backfill before giving up, so a bad cursor can't spin
 * forever. 50 pages × 500 covers 25k outcomes — far past any real account. */
const MAX_PAGES = 50;

export function withdrawalsSource(
  { rest, ws }: SyncContext,
  account: Address,
): ResourceSource<Withdrawal[]> {
  return (h) => {
    let alive = true;
    const byHash = new Map<string, Withdrawal>();
    // Cursor into the outcome log: the newest tick fully absorbed, plus the last
    // id seen inside it. Both are needed because one tick can span a page — the
    // deadline alone can only re-serve the tick's earlier rows or skip its later
    // ones.
    let sinceUs = 0;
    let sinceId: Withdrawal["txHash"] | undefined;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // Newest tick a backfill's node could serve; never behind the rows it returned.
    let servedUs = 0;
    let sub: Subscription | undefined;

    const publish = () => {
      // Newest first: a user reads their most recent withdrawal at the top, and
      // the hash tiebreak keeps a same-tick pair from reordering between renders.
      h.set([...byHash.values()].sort((a, b) => b.timeUs - a.timeUs || b.txHash.localeCompare(a.txHash)));
    };

    const absorb = (items: Withdrawal[]) => {
      for (const w of items) {
        byHash.set(w.txHash, w);
        // Never move the cursor backwards: an out-of-order arrival would
        // otherwise re-serve ticks we already hold.
        if (w.timeUs >= sinceUs) { sinceUs = w.timeUs; sinceId = w.txHash; }
      }
    };

    /**
     * Walk forward from the cursor until the log is exhausted.
     *
     * Serialised on `inflight` because two callers race by construction: the
     * immediate seed and the socket's `open` overlap on a cold start, and a
     * reconnect can fire while a retry's backfill is still paging. Both share
     * the cursor, so concurrent loops would re-request each other's pages.
     */
    let inflight: Promise<boolean> | undefined;
    const backfill = (): Promise<boolean> => (inflight ??= run().finally(() => { inflight = undefined; }));

    const run = async () => {
      try {
        // Page against a cursor local to this run. The shared one is also moved
        // by live pushes, and a push landing mid-backfill would jump the next
        // page past the rest of an older tick — rows the forward-only cursor
        // could then never come back for.
        let pageSince = sinceUs;
        let pageSinceId = sinceId;
        for (let page = 0; page < MAX_PAGES; page++) {
          const query = { since: pageSince, sinceId: pageSinceId, limit: PAGE_LIMIT };
          const res = await readAtLeast(
            (min) => rest.bridgeWithdrawals(account, query, min),
            Math.max(sinceUs, servedUs),
          );
          if (!alive) return false;
          const rows = res.withdrawals;
          absorb(rows);
          // Pages may come from different nodes: only the one that served the end of the log vouches for it.
          if (rows.length < PAGE_LIMIT) { servedUs = Math.max(servedUs, res.timestampUs); break; }
          // Rows come back ascending, so the last one is this page's high-water
          // mark — regardless of what the stream did to the shared cursor.
          const last = rows[rows.length - 1]!;
          pageSince = last.timeUs;
          pageSinceId = last.txHash;
        }
        // Once, after paging: publishing per page re-copies and re-sorts
        // everything accumulated so far for a list the user sees for
        // milliseconds — O(pages²) on exactly the accounts paging exists for.
        //
        // Unconditional, including when nothing was found. An account with no
        // withdrawals must still reach a defined `[]`, or every consumer stays
        // on "not loaded yet" and treats the first live outcome as its initial
        // snapshot — silently swallowing a user's first-ever withdrawal.
        publish();
        return true;
      } catch (e) {
        // Publish on the failure path too, for exactly the reason the success
        // path publishes unconditionally: a consumer left on "not loaded yet"
        // treats the first live outcome as its initial snapshot and swallows it.
        // A failed backfill is a reason to have no history — not a reason to
        // misread the next thing that happens. `fail` records the error beside
        // the value rather than replacing it, so a caller can read both.
        publish();
        // Only surface the failure when there is nothing to show; otherwise the
        // stream is still feeding a usable list and a toast would be noise.
        if (byHash.size === 0) h.fail(e as Error);
        return false;
      }
    };

    const subscribe = (since: number | undefined) => sub = ws.subscribe(
      "pod_withdrawals",
      // Live-only until a cursor exists. This is a replay channel, so the server
      // accepts `since` only when its buffer still reaches back that far — and
      // `since: 0` never does, so sending it would fail the subscribe every time
      // and burn the retry budget below on a self-inflicted rejection. (The
      // `since: 0` idiom belongs to the *state* channels, which answer it with a
      // snapshot.) REST backfill covers history either way.
      { account, since },
      (result) => {
        retries = 0;
        // A frame means the subscription is healthy, so a retry armed by an
        // earlier rejection has nothing left to fix. Letting it fire would call
        // `resubscribe()` on a live subscription, which drops the server's id
        // without an `eth_unsubscribe` and leaks one subscription per occurrence.
        if (retryTimer) { clearTimeout(retryTimer); retryTimer = undefined; }
        // One message per tick carrying that tick's outcomes for this account.
        absorb((result as WireWithdrawal[]).map(decodeWithdrawal));
        publish();
        sub!.update({ since: Math.max(sinceUs, servedUs) }); // keep the resume point fresh for a reconnect
      },
      () => {
        // Rejected — usually a `since` older than the replay buffer. Back off,
        // re-seed over REST (which has no such horizon), and resubscribe; after
        // a couple of failures drop `since` and settle for live-only.
        //
        // Bounded, because the other reason for a rejection is a node that
        // doesn't serve this channel at all — an older build, since the app
        // ships ahead of the fleet. Retrying that forever is a request every
        // 30s for the lifetime of the tab, so give up and leave the REST-seeded
        // list in place rather than polling a node that will never answer.
        if (!alive || retries >= MAX_SUB_RETRIES) return;
        retries++;
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          void backfill().then(() => {
            if (!alive) return;
            // Live-only until a real cursor exists (see the subscribe above), and
            // dropped again after a couple of failures in case the replay buffer
            // has outrun it.
            const since = Math.max(sinceUs, servedUs);
            sub!.update({ since: retries > 2 || since === 0 ? undefined : since });
            sub!.resubscribe();
          });
        }, subBackoffMs(retries));
      },
    );

    // Seed immediately — REST needs no socket, so history paints without waiting
    // on the handshake — and fill the gap again on every reconnect.
    const offOpen = ws.on("open", () => { if (alive) void backfill(); });
    // Subscribing after the first backfill lets `since` cover the gap between a
    // lagging REST node and the head of the node the socket landed on.
    void backfill().then((ok) => {
      if (!alive) return;
      const since = Math.max(sinceUs, servedUs);
      subscribe(ok && since > 0 ? since : undefined);
    });

    return () => {
      alive = false;
      offOpen();
      if (retryTimer) clearTimeout(retryTimer);
      sub?.unsubscribe();
    };
  };
}
