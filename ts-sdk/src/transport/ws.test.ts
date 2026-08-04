// The subscription-close path. Worth pinning because none of it is reachable
// from `typecheck`/`build`: the bug this covers was a dispatch that compiled
// perfectly and sent a close frame to the wrong callback.

import { describe, expect, it, onTestFinished, vi } from "vitest";

import { PodSubscriptionClosedError, PodWsClient } from "./ws.js";
import type { WebSocketCtor } from "./ws.js";

type Json = Record<string, unknown>;

const SUB_ID = "0xsub1";

/** A `WebSocket` stand-in: records what the client sent, lets a test push frames back. */
class FakeSocket {
  static last: FakeSocket | undefined;
  sent: Json[] = [];
  onopen?: () => void;
  onmessage?: (ev: { data: string }) => void;
  onclose?: () => void;

  constructor(_url: string) {
    FakeSocket.last = this;
    // The real ctor connects asynchronously; mirror that so `subscribe` before
    // open takes the same path it does in production.
    setTimeout(() => this.onopen?.(), 0);
  }
  send(raw: string): void {
    this.sent.push(JSON.parse(raw) as Json);
  }
  close(): void {
    this.onclose?.();
  }
  sentMethod(method: string): Json | undefined {
    return this.sent.find((m) => m.method === method);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** The lagged close, the one that actually fires in production. */
const LAGGED: Json = {
  code: -32020,
  message: "subscription lagged behind the tick broadcast",
  data: { resumable: true, missed: 42, resume_since: 1_718_900_000_000_000 },
};

/**
 * A client with one accepted subscription, ready to receive frames.
 *
 * `idleTimeoutMs` is long enough that the idle-reconnect timer never fires
 * mid-test; `onTestFinished` is what actually clears it.
 */
async function subscribed(withOnError = true) {
  const client = new PodWsClient({
    wsUrl: "ws://test",
    WebSocket: FakeSocket as unknown as WebSocketCtor,
    idleTimeoutMs: 60 * 60_000,
  });
  onTestFinished(() => client.close());

  const onMessage = vi.fn();
  const onError = vi.fn();
  const sub = client.subscribe(
    "pod_orders",
    { account: "0xabc", since: 500 },
    onMessage,
    withOnError ? onError : undefined,
  );
  await flush(); // onopen -> eth_subscribe

  const socket = FakeSocket.last!;
  const req = socket.sentMethod("eth_subscribe");
  expect(req, "client sent eth_subscribe").toBeTruthy();
  socket.sent = [];

  /** Deliver an `eth_subscription` notification for this subscription. */
  const notify = (params: Json) =>
    socket.onmessage?.({
      data: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: { subscription: SUB_ID, ...params },
      }),
    });

  return { client, sub, socket, onMessage, onError, notify, subscribeReq: req! };
}

/** Accept the pending `eth_subscribe` so notifications route to the subscription. */
function accept(socket: FakeSocket, req: Json): void {
  socket.onmessage?.({ data: JSON.stringify({ jsonrpc: "2.0", id: req.id, result: SUB_ID }) });
  socket.sent = []; // only care about what follows the ack
}

describe("PodWsClient subscription close", () => {
  it("routes a close to onError instead of dispatching it as an update", async () => {
    const { socket, subscribeReq, notify, onMessage, onError } = await subscribed();
    accept(socket, subscribeReq);

    notify({ error: LAGGED });

    // The bug: this arrived as `onMessage(undefined)`, which for the snapshot
    // sources throws inside the handler rather than doing nothing.
    expect(onMessage).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();

    const err = onError.mock.calls[0]![0] as PodSubscriptionClosedError;
    expect(err).toBeInstanceOf(PodSubscriptionClosedError);
    expect(err).toBeInstanceOf(Error); // consumers branch on this
    expect(err.code).toBe(-32020);
    expect(err.resumable).toBe(true);
    expect(err.resumeSince).toBe(1_718_900_000_000_000);
    expect(err.missed).toBe(42);
    expect(err.message).toContain("lagged");
    // `raw` keeps what this version does not map — asserted on a field with no
    // property of its own, so it cannot pass by accident.
    expect((err.raw as { data: Json }).data).toMatchObject({ resume_since: 1_718_900_000_000_000 });
  });

  it("still delivers ordinary updates", async () => {
    const { socket, subscribeReq, notify, onMessage, onError } = await subscribed();
    accept(socket, subscribeReq);

    notify({ result: [{ type: "new" }] });

    expect(onMessage).toHaveBeenCalledWith([{ type: "new" }]);
    expect(onError).not.toHaveBeenCalled();
  });

  it("deregisters the closed subscription", async () => {
    const { sub, socket, subscribeReq, notify, onMessage } = await subscribed();
    accept(socket, subscribeReq);

    notify({ error: LAGGED });
    // Anything further under that id belongs to a subscription that no longer
    // exists, and must not reach the owner.
    notify({ result: [{ type: "late" }] });
    expect(onMessage).not.toHaveBeenCalled();

    // The server already dropped it, so asking again is a wasted round trip
    // against an id it no longer knows.
    sub.unsubscribe();
    expect(socket.sentMethod("eth_unsubscribe")).toBeUndefined();
  });

  it("advances the subscription's cursor so a resubscribe resumes from the close", async () => {
    const { sub, socket, subscribeReq, notify } = await subscribed();
    accept(socket, subscribeReq);

    notify({ error: LAGGED });
    sub.resubscribe();

    // Not the `since: 500` it subscribed with — resuming there would replay, and
    // resuming from a stale cursor after a reconnect would leave a hole.
    const params = (socket.sentMethod("eth_subscribe")!.params as unknown[])[1] as Json;
    expect(params.since).toBe(1_718_900_000_000_000);
  });

  it("leaves the cursor alone when the close is not resumable", async () => {
    const { sub, socket, subscribeReq, notify } = await subscribed();
    accept(socket, subscribeReq);

    // A server bug: the resume watermark must not be trusted, and the owner is
    // told not to retry — so the subscription keeps the cursor it had.
    notify({ error: { code: -32023, message: "failed to serialize", data: { resumable: false, resume_since: 9_000 } } });
    sub.resubscribe();

    const params = (socket.sentMethod("eth_subscribe")!.params as unknown[])[1] as Json;
    expect(params.since).toBe(500);
  });

  it("treats an unrecognised close as not resumable", async () => {
    const { socket, subscribeReq, notify, onError } = await subscribed();
    accept(socket, subscribeReq);

    // A future reason this version does not know, with no `data`. Defaulting
    // `resumable` to true here would hot-loop a resubscribe.
    notify({ error: { code: -39_999, message: "reason from a newer server" } });

    const err = onError.mock.calls[0]![0] as PodSubscriptionClosedError;
    expect(err.resumable).toBe(false);
    expect(err.code).toBe(-39_999);
    expect(err.resumeSince).toBeUndefined();
  });

  it("resumes a partly delivered batch from the (batch, book) cursor", async () => {
    const { sub, socket, subscribeReq, notify, onError } = await subscribed();
    accept(socket, subscribeReq);

    // A `pod_orders_v2` close mid-batch: the client holds some of that batch's
    // books, which `resume_since` alone cannot express.
    notify({ error: {
      code: -32020,
      message: "subscription lagged behind the tick broadcast",
      data: { resumable: true, resume_since: 1_718_900_000_000_000, resume_since_book: "0x07" },
    } });
    sub.resubscribe();

    expect((onError.mock.calls[0]![0] as PodSubscriptionClosedError).resumeSinceBook).toBe("0x07");
    const params = (socket.sentMethod("eth_subscribe")!.params as unknown[])[1] as Json;
    expect(params.since).toBe(1_718_900_000_000_000);
    expect(params.since_book).toBe("0x07");
  });

  it("clears the book half when the close says the batch landed whole", async () => {
    const { sub, socket, subscribeReq, notify } = await subscribed();
    accept(socket, subscribeReq);

    // Mid-batch close, then a later one that carries no book.
    notify({ error: { code: -32020, message: "lagged", data: { resumable: true, resume_since: 100, resume_since_book: "0x07" } } });
    sub.resubscribe();
    accept(socket, socket.sentMethod("eth_subscribe")!);
    notify({ error: { code: -32020, message: "lagged", data: { resumable: true, resume_since: 200 } } });
    sub.resubscribe();

    // Carrying 0x07 into batch 200 would ask the server to skip every book at or
    // below it there — books this client has never seen.
    const params = (socket.sentMethod("eth_subscribe")!.params as unknown[])[1] as Json;
    expect(params.since).toBe(200);
    expect(params.since_book).toBeUndefined();
  });

  it("surfaces a close with no onError on the client error event", async () => {
    const { client, socket, subscribeReq, notify } = await subscribed(false);
    accept(socket, subscribeReq);

    const seen: unknown[] = [];
    client.on("error", (e) => seen.push(e));
    notify({ error: { code: -32_021, message: "node is shutting down", data: { resumable: true } } });

    // Not every caller passes onError; a close must still be observable
    // somewhere rather than vanishing.
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(PodSubscriptionClosedError);
    expect((seen[0] as PodSubscriptionClosedError).code).toBe(-32_021);
  });
});
