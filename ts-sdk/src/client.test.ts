// Resource memoisation. Two calls that ask for the same feed must hand back the
// same instance: a second one is a second REST seed and a second socket
// subscription for a list the app already has.

import { describe, expect, it } from "vitest";

import { PodTradeClient } from "./client.js";
import type { Address } from "./types/public.js";

const ACCOUNT = "0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1" as Address;

class FakeWebSocket {
  constructor(public url: string) {}
  close(): void {}
  send(): void {}
}

const client = () => new PodTradeClient({
  restUrl: "http://node.test/v1",
  wsUrl: "ws://node.test/v1",
  WebSocket: FakeWebSocket as never,
});

describe("PodTradeClient.activity", () => {
  it("keeps one feed per account, a query being a view on it", () => {
    const c = client();
    try {
      const feed = c.activity(ACCOUNT);
      expect(c.activity(ACCOUNT.toUpperCase().replace("0X", "0x") as never)).toBe(feed);
      expect(c.activity(ACCOUNT, { from: 1 })).toBe(feed.view({ from: 1 }));
      expect(c.activity(ACCOUNT, { types: [] })).toBe(feed.view({}));
      // Key order is how the caller typed the object, not part of the question.
      expect(c.activity(ACCOUNT, { to: 2, from: 1 })).toBe(c.activity(ACCOUNT, { from: 1, to: 2 }));
    } finally {
      c.close();
    }
  });
});
