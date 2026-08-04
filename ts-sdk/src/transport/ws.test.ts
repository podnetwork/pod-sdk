// The subscription-close path. Worth pinning because nothing here is reachable
// from `typecheck`/`build`: the bug this covers was a dispatch that compiled
// perfectly and sent a close frame to the wrong callback.

import { describe, expect, it, vi } from "vitest";

import { PodSubscriptionClosedError, PodWsClient } from "./ws.js";
import type { Channel, SubParams } from "./ws.js";

type Json = Record<string, unknown>;

/** A `WebSocket` stand-in: records what the client sent, lets a test push frames back. */
class FakeSocket {
  static last: FakeSocket | undefined;
  sent: Json[] = [];
  onopen?: () => void;
  onmessage?: (ev: { data: string }) => void;
  onerror?: (ev: unknown) => void;
  onclose?: () => void;

  constructor(public url: string) {
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
  /** Deliver a server frame. */
  deliver(frame: Json): void {
    this.onmessage?.({ data: JSON.stringify(frame) });
  }
  sentMethod(method: string): Json | undefined {
    return this.sent.find((m) => m.method === method);
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/** A close frame's `params.error`, as the server sends it. */
const closeError = (over: Json = {}): Json => ({
  code: -32020,
  message: "subscription lagged behind the tick broadcast",
  data: { resumable: true, missed: 42, resume_since: 1_718_900_000_000_000 },
  ...over,
});

/**
 * Client with one accepted subscription, ready to receive frames.
 *
 * `idleTimeoutMs` is enormous so the idle-reconnect timer never fires mid-test;
 * `client.close()` in a `finally` is what actually clears it.
 */
async function subscribed(opts: {
  channel?: Channel;
  params?: SubParams;
  withOnError?: boolean;
}) {
  const client = new PodWsClient({
    wsUrl: "ws://test",
    WebSocket: FakeSocket as unknown as { new (url: string): WebSocket },
    idleTimeoutMs: 60 * 60_000,
  });
  const onMessage = vi.fn();
  const onError = vi.fn();
  const sub = client.subscribe(
    opts.channel ?? "pod_orders",
    opts.params ?? { account: "0xabc" as never },
    onMessage,
    opts.withOnError === false ? undefined : onError,
  );
  await flush(); // onopen -> eth_subscribe

  const socket = FakeSocket.last!;
  const req = socket.sentMethod("eth_subscribe")!;
  expect(req, "client sent eth_subscribe").toBeTruthy();
  socket.deliver({ jsonrpc: "2.0", id: req.id, result: "0xsub1" });
  socket.sent = []; // only care about what follows the ack

  return { client, sub, socket, onMessage, onError };
}

describe("PodWsClient subscription close", () => {
  it("routes a close to onError instead of dispatching it as an update", async () => {
    const { client, socket, onMessage, onError } = await subscribed({});
    try {
      socket.deliver({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: { subscription: "0xsub1", error: closeError() },
      });

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
      expect(err.raw).toMatchObject({ code: -32020 });
    } finally {
      client.close();
    }
  });

  it("still delivers ordinary updates", async () => {
    const { client, socket, onMessage, onError } = await subscribed({});
    try {
      socket.deliver({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: { subscription: "0xsub1", result: [{ type: "new" }] },
      });
      expect(onMessage).toHaveBeenCalledWith([{ type: "new" }]);
      expect(onError).not.toHaveBeenCalled();
    } finally {
      client.close();
    }
  });

  it("deregisters the closed subscription", async () => {
    const { client, sub, socket, onMessage, onError } = await subscribed({});
    try {
      socket.deliver({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: { subscription: "0xsub1", error: closeError() },
      });
      onError.mockClear();

      // Anything further under that id belongs to a subscription that no longer
      // exists, and must not reach the owner.
      socket.deliver({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: { subscription: "0xsub1", result: [{ type: "late" }] },
      });
      expect(onMessage).not.toHaveBeenCalled();

      // The server already dropped it, so asking again is a wasted round trip
      // against an id it no longer knows.
      sub.unsubscribe();
      expect(socket.sentMethod("eth_unsubscribe")).toBeUndefined();
    } finally {
      client.close();
    }
  });

  it("treats an unrecognised close as not resumable", async () => {
    const { client, socket, onError } = await subscribed({});
    try {
      // A future reason this version does not know, with no `data`. Defaulting
      // `resumable` to true here would hot-loop a resubscribe.
      socket.deliver({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: {
          subscription: "0xsub1",
          error: { code: -39_999, message: "reason from a newer server" },
        },
      });
      const err = onError.mock.calls[0]![0] as PodSubscriptionClosedError;
      expect(err.resumable).toBe(false);
      expect(err.code).toBe(-39_999);
      expect(err.resumeSince).toBeUndefined();
    } finally {
      client.close();
    }
  });

  it("carries resume_since_book for a partly delivered batch", async () => {
    const { client, socket, onError } = await subscribed({});
    try {
      socket.deliver({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: {
          subscription: "0xsub1",
          error: closeError({
            data: { resumable: true, resume_since: 7_000, resume_since_book: "0xbook" },
          }),
        },
      });
      const err = onError.mock.calls[0]![0] as PodSubscriptionClosedError;
      expect(err.resumeSince).toBe(7_000);
      expect(err.resumeSinceBook).toBe("0xbook");
    } finally {
      client.close();
    }
  });

  it("surfaces a close with no onError on the client error event", async () => {
    const { client, socket } = await subscribed({ withOnError: false });
    const seen: unknown[] = [];
    client.on("error", (e) => seen.push(e));
    try {
      socket.deliver({
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: {
          subscription: "0xsub1",
          error: { code: -32_021, message: "node is shutting down", data: { resumable: true } },
        },
      });
      // Not every caller passes onError; a close must still be observable
      // somewhere rather than vanishing.
      expect(seen).toHaveLength(1);
      expect(seen[0]).toBeInstanceOf(PodSubscriptionClosedError);
      expect((seen[0] as PodSubscriptionClosedError).code).toBe(-32_021);
    } finally {
      client.close();
    }
  });
});
