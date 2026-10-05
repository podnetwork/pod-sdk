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
  it("reads no filter and an empty filter as one feed", () => {
    const c = client();
    try {
      expect(c.activity(ACCOUNT, { types: [] })).toBe(c.activity(ACCOUNT));
      // Key order is how the caller typed the object, not part of the question.
      expect(c.activity(ACCOUNT, { to: 2, from: 1 })).toBe(c.activity(ACCOUNT, { from: 1, to: 2 }));
      expect(c.activity(ACCOUNT, { from: 1 })).not.toBe(c.activity(ACCOUNT));
    } finally {
      c.close();
    }
  });
});
