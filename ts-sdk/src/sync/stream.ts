// The subscribe / resume / re-seed loop shared by the account feeds.
//
// Reconnect: on every (re)connect the owner re-seeds its first page (the
// authoritative snapshot) and refreshes the cursor from its watermark; the WS
// auto-resubscribes, and if the cursor is too old (down too long) `onSubError`
// re-seeds and resubscribes. A server-initiated close is not the same as a
// rejection: it reports where delivery stopped, so resuming from one is a bare
// `resubscribe()` with no re-seed.

import type { Channel, PodWsClient, SubParams, Subscription } from "../transport/ws.js";
import { PodSubscriptionClosedError } from "../transport/ws.js";

/**
 * Consecutive server closes we resume from before falling back to the re-seed
 * path. A lagged close is recoverable by resubscribing, so the fast path is the
 * right default — but a stream that keeps closing is one we are not keeping up
 * with, and re-seeding beats replaying a growing backlog on every attempt.
 */
const FAST_RESUMES_BEFORE_RESEED = 3;

/**
 * Re-seed attempts that keep the cursor before we conclude the cursor is what the
 * server is rejecting, drop it, and settle for streaming live.
 */
const RETRIES_BEFORE_DROPPING_CURSOR = 2;

export interface ResumableStreamOptions {
  ws: PodWsClient;
  channel: Channel;
  /** Everything that identifies the subscription except the cursor. */
  params: SubParams;
  /** Where the cursor starts, before any page or frame has landed. */
  cursor: SubParams;
  /** Orders two stream positions the way the server does. */
  compare(a: SubParams, b: SubParams): number;
  /**
   * Re-seed over REST; `false` when the seed failed. Owns raising the cursor to
   * the page's watermark.
   */
  reseed(): Promise<boolean>;
  onFrame(result: unknown): void;
}

export class ResumableStream {
  /**
   * Where the stream is: the last frame accepted. Replaced whole rather than
   * patched half at a time — on `pod_orders_v2` `sinceBook` names a book *within*
   * `since`, so the two are one fact and a mismatched pair asks the server to skip
   * books we never saw.
   */
  cursor: SubParams;
  private sub: Subscription | undefined;
  private alive = false;
  private subRetries = 0;
  private fastResumes = 0;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private offOpen?: () => void;

  constructor(private readonly opts: ResumableStreamOptions) {
    this.cursor = opts.cursor;
  }

  /** Whether the owner's resource is still running; guards its async seeds. */
  get running(): boolean { return this.alive; }

  start(): void {
    this.alive = true;
    this.offOpen = this.opts.ws.on("open", () => { if (this.alive) this.seed(); });
    this.seed(); // initial paint (REST is independent of the socket being open)
  }

  stop(): void {
    this.alive = false;
    this.offOpen?.();
    this.offOpen = undefined;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.sub?.unsubscribe();
    this.sub = undefined;
  }

  /** The server's `already_delivered`: is this frame at or behind where we are? */
  delivered(at: SubParams): boolean {
    return this.opts.compare(at, this.cursor) <= 0;
  }

  /** Move to `at` and tell the transport, so a reconnect resumes from there. */
  advance(at: SubParams): void {
    this.cursor = at;
    this.sub?.update(at);
  }

  /** Move to `at` only when it is ahead. Never rewinds — a re-delivered frame is dropped. */
  raise(at: SubParams): void {
    if (this.opts.compare(at, this.cursor) > 0) this.cursor = at;
  }

  seed(): void {
    const done = (ok: boolean) => {
      if (!this.alive) return;
      if (!ok) {
        // Nothing is subscribed yet, so no close or rejection can arrive to schedule
        // another attempt — a failed first paint has to re-arm itself or the resource
        // stays empty for good. With a subscription up, the live stream is unaffected
        // and its own error path owns the recovery.
        if (!this.sub) this.scheduleReseed();
        return;
      }
      if (!this.sub) this.subscribe();
      else this.pushCursor(); // refresh for the next reconnect
    };
    void this.opts.reseed().then(done, () => done(false));
  }

  private subscribe(): void {
    this.sub = this.opts.ws.subscribe(
      this.opts.channel,
      { ...this.opts.params, ...this.cursor },
      (r) => this.onFrame(r),
      (e) => this.onSubError(e),
    );
  }

  /**
   * Push the cursor to the transport, both halves.
   *
   * `update` merges, so sending `{ since }` alone would leave whatever `sinceBook`
   * was there before — a book from an older batch beside a newer `since`, which asks
   * the server to skip less than it should and re-send the difference.
   */
  private pushCursor(): void {
    this.sub?.update({ since: this.cursor.since, sinceBook: this.cursor.sinceBook });
  }

  private onFrame(result: unknown): void {
    // Live data flowing → the subscription is healthy on both paths.
    this.subRetries = 0;
    this.fastResumes = 0;
    this.opts.onFrame(result);
  }

  /**
   * The subscription is not running: `eth_subscribe` was rejected, or the server
   * closed it.
   *
   * A resumable close needs neither a re-seed nor a delay: the server reports where
   * it stopped, so resubscribing from that delivers exactly the frames we never got.
   * That fast path is only taken while the socket is actually open — `resubscribe()`
   * is a no-op otherwise, which would spend the budget without an attempt and leave
   * nothing scheduled, and `-32021` (node shutting down) arrives exactly as the
   * socket goes away.
   *
   * Everything else (a rejection, a server bug, a close with the socket already
   * gone, or closes that keep coming) takes the slow path: backed off and capped, so
   * a server that keeps refusing cannot spin this into a tight re-seed loop, and
   * eventually the cursor is dropped (the likely culprit) to just stream live. Both
   * counters reset once live data flows (`onFrame`).
   */
  private onSubError(err: unknown): void {
    if (!this.alive) return;
    const canFastResume = err instanceof PodSubscriptionClosedError && err.resumable
      && this.fastResumes < FAST_RESUMES_BEFORE_RESEED && this.opts.ws.state === "open";
    if (canFastResume) {
      this.fastResumes++;
      // Adopt the server's watermark only when it is ahead of ours: it knows which
      // frames it handed over, but a re-seed may already have carried us past it,
      // and rewinding would re-deliver frames we have applied.
      const reported: SubParams = { since: err.resumeSince, sinceBook: err.resumeSinceBook };
      if (err.resumeSince !== undefined) this.raise(reported);
      // The transport rewrote `sub.params` from the close before this ran, so without
      // pushing our own decision back the wire resumes from the server's point
      // regardless and the guard above protects nothing.
      this.pushCursor();
      this.sub?.resubscribe();
      return;
    }
    // The slow path, and the one that answers "what if we fell behind the server's
    // replay buffer": `eth_subscribe` rejects a `since` older than what the buffer
    // retains, and the prescribed recovery is to backfill over REST and resubscribe.
    // That is what this is. The re-seed also *raises the cursor* to the page's
    // watermark, so the position that was too old is gone by the first retry and the
    // resubscribe is accepted with no gap — the server replays from the page forward.
    // Dropping the cursor below is the backstop for when even that fresh watermark is
    // refused (the indexer further behind than the buffer retains): live-only
    // resubscribe, trading the unreplayable window for a working stream.
    this.scheduleReseed();
  }

  /**
   * Back off, re-seed over REST, then resubscribe — and keep trying.
   *
   * The re-seed can fail too (the same node is usually behind both the stream and the
   * indexer), and a failure has to re-arm here: not resubscribing means no further
   * close or rejection arrives, so nothing else would ever schedule another attempt and
   * the stream would stay down with no error surfaced. Capped, so a node that keeps
   * refusing cannot spin this.
   */
  private scheduleReseed(): void {
    this.subRetries++;
    const delay = Math.min(30_000, 500 * 2 ** (this.subRetries - 1));
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      void this.opts.reseed().then((ok) => {
        if (!this.alive) return;
        if (!ok) { this.scheduleReseed(); return; }
        // Retrying the first paint: there is no subscription to resume, and no
        // cursor the server has refused — open one from the page we just landed.
        if (!this.sub) { this.subscribe(); return; }
        const tooOld = this.subRetries > RETRIES_BEFORE_DROPPING_CURSOR;
        if (tooOld) this.sub?.update({ since: undefined, sinceBook: undefined });
        else this.pushCursor();
        this.sub?.resubscribe();
      });
    }, delay);
  }
}
