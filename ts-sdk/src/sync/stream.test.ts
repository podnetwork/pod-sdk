// `ResumableStream` on its own: the subscribe / resume / re-seed loop both
// account feeds share. Every rule here is a recovery path the happy-path feed
// tests never reach, and none of it is reachable from `typecheck` — a close
// frame is `unknown` off the socket.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ResumableStream } from "./stream.js";
import { PodHttpError } from "../transport/rest.js";
import { PodSubscriptionClosedError, type PodWsClient, type SubParams } from "../transport/ws.js";
import type { Address, MarketId } from "../types/public.js";

const ACCOUNT = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;
const book = (n: number) => `0x${n.toString(16).padStart(64, "0")}` as MarketId;
const B1 = book(1);
const B9 = book(9);
const SEED = 3_000_000;

/**
 * A stream over a stub socket. `seeds` scripts the re-seeds in order — a number
 * is a page whose watermark raises the cursor to it, an `Error` is a failed
 * fetch; the last entry repeats for every attempt after it.
 */
function harness(seeds: Array<number | Error> = [SEED]) {
  const queue = [...seeds];
  let onOpen: (() => void) | undefined;
  let deliver: ((r: unknown) => void) | undefined;
  let refuse: ((e: unknown) => void) | undefined;
  const subscribed: SubParams[] = [];
  const updates: SubParams[] = [];
  const frames: unknown[] = [];
  let resubscribes = 0;
  let unsubscribes = 0;
  let seeds_ = 0;

  const ws = {
    state: "open",
    on: (_event: string, handler: () => void) => {
      onOpen = handler;
      return () => { onOpen = undefined; };
    },
    subscribe: (
      _channel: string,
      params: SubParams,
      onMessage: (r: unknown) => void,
      onError: (e: unknown) => void,
    ) => {
      subscribed.push({ ...params });
      deliver = onMessage;
      refuse = onError;
      return {
        unsubscribe: () => { unsubscribes++; },
        update: (p: SubParams) => { updates.push(p); },
        resubscribe: () => { resubscribes++; },
      };
    },
  };

  const stream = new ResumableStream({
    ws: ws as unknown as PodWsClient,
    channel: "pod_orders_v2",
    params: { account: ACCOUNT },
    reseed: async () => {
      seeds_++;
      const next = queue.length > 1 ? queue.shift()! : queue[0] ?? SEED;
      if (next instanceof Error) throw next;
      stream.raise({ since: next, sinceBook: undefined });
      return true;
    },
    onFrame: (r) => { frames.push(r); },
  });

  return {
    stream,
    subscribed,
    updates,
    frames,
    open: () => onOpen?.(),
    frame: (f: unknown) => deliver?.(f),
    close: (e: unknown) => refuse?.(e),
    seeds: () => seeds_,
    resubscribes: () => resubscribes,
    unsubscribes: () => unsubscribes,
  };
}

const closed = (resumable: boolean, since?: number, atBook?: MarketId) =>
  new PodSubscriptionClosedError({
    code: resumable ? -32020 : -32023,
    data: { resumable, resume_since: since, resume_since_book: atBook },
  });

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("ResumableStream cursor", () => {
  it("subscribes from the seeded watermark and carries both halves forward", async () => {
    const h = harness();
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.subscribed).toEqual([{ account: ACCOUNT, since: SEED }]);

    h.stream.advance({ since: SEED + 1, sinceBook: B1 });
    expect(h.updates.at(-1)).toEqual({ since: SEED + 1, sinceBook: B1 });

    // Never rewinds, and an absent book is the whole batch — above every book in it.
    h.stream.raise({ since: SEED, sinceBook: undefined });
    expect(h.stream.cursor).toEqual({ since: SEED + 1, sinceBook: B1 });
    h.stream.raise({ since: SEED + 1, sinceBook: undefined });
    expect(h.stream.cursor.sinceBook).toBeUndefined();
    expect(h.stream.delivered({ since: SEED + 1, sinceBook: B9 })).toBe(true);
  });
});

describe("ResumableStream resume", () => {
  it("resubscribes from the server's watermark on a resumable close, without re-seeding", async () => {
    const h = harness();
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);

    h.close(closed(true, SEED + 500_000, B1));
    expect(h.resubscribes()).toBe(1);
    expect(h.seeds()).toBe(1);
    // Both halves pushed back: `update` merges, so a lone `since` would leave a
    // book from an older batch beside a newer batch.
    expect(h.updates.at(-1)).toEqual({ since: SEED + 500_000, sinceBook: B1 });
  });

  it("falls back to a re-seed once the fast resumes are spent", async () => {
    const h = harness([SEED, SEED + 9_000_000]);
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);

    for (let i = 0; i < 3; i++) h.close(closed(true, SEED + i, undefined));
    expect(h.resubscribes()).toBe(3);
    expect(h.seeds()).toBe(1);

    h.close(closed(true, SEED + 9, undefined));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(h.seeds(), "the fourth close re-seeds instead").toBe(2);
    expect(h.resubscribes()).toBe(4);
  });

  it("drops a cursor the server keeps refusing", async () => {
    const h = harness();
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);

    for (let i = 0; i < 3; i++) {
      h.close(closed(false));
      await vi.advanceTimersByTimeAsync(5_000);
    }
    // Two attempts keep the cursor; the third concludes the cursor is the problem.
    expect(h.updates.at(-1)).toEqual({ since: undefined, sinceBook: undefined });
    expect(h.updates.slice(0, -1).every((u) => u.since !== undefined)).toBe(true);
  });

  it("resets the retry budget once a retried first paint subscribes", async () => {
    const h = harness([new Error("down"), new Error("down"), SEED]);
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(500);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(h.subscribed).toHaveLength(1);

    // A live stream's first refusal must not inherit the seed's attempts.
    h.close(closed(false));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(h.updates.at(-1)?.since).toBe(SEED);
  });

  it("cancels a pending retry when a later seed succeeds on its own", async () => {
    const h = harness([new Error("down"), SEED]);
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.seeds()).toBe(1);

    // The socket came back before the retry was due; its seed is the one that lands.
    h.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(h.seeds()).toBe(2);
    expect(h.subscribed).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.seeds(), "the orphaned retry must not fire").toBe(2);
    expect(h.resubscribes()).toBe(0);
  });

  it("gives up on a seed the server refused on its own terms", async () => {
    const h = harness([new PodHttpError(400, "http://node.test", "bad request")]);
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.seeds()).toBe(1);
    expect(h.subscribed).toHaveLength(0);
  });

  it("treats a live frame as the all-clear", async () => {
    const h = harness();
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);

    h.close(closed(false));
    h.frame({ batch: SEED + 1 });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.frames).toHaveLength(1);
    expect(h.seeds(), "there is nothing for the armed retry to recover").toBe(1);
  });

  it("tears down on stop, and stays down", async () => {
    const h = harness();
    h.stream.start();
    await vi.advanceTimersByTimeAsync(0);

    h.stream.stop();
    expect(h.unsubscribes()).toBe(1);
    expect(h.stream.running).toBe(false);

    h.open();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(h.seeds()).toBe(1);
    expect(h.subscribed).toHaveLength(1);
  });
});
