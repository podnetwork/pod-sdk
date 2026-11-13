// Resource memoisation. Two calls that ask for the same feed must hand back the
// same instance: a second one is a second REST seed and a second socket
// subscription for a list the app already has.

import { describe, expect, it, vi } from "vitest";

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

describe("PodTradeClient.bridgeLimits", () => {
  const config = { claim_chain_id: 42161, source_contract: "0xEe0B4585631d423310ab95e7d4716Eb79b9302E2", version: 1,
    tokens: [{ pod_token: "0x0000000000000000000000000000000000000000", l1_token: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, min: "1000000", max: "500000000" }] };
  const w = (n: bigint) => n.toString(16).padStart(64, "0");
  const raw = "0x" + [1_000_000n, 2_000_000_000n, 1_000_000_000n, 1_000_000n, 1_000n, 784_992_818n, 1_000n, 0n].map(w).join("");
  const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/bridge/config")) return new Response(JSON.stringify(config));
    expect(url).toBe("http://arb.test");
    const { method } = JSON.parse(String(init?.body));
    const result = { eth_chainId: "0xa4b1", eth_getBlockByNumber: { number: "0x10", timestamp: "0x2a300" }, eth_call: raw }[method as string];
    return new Response(JSON.stringify({ result }));
  });
  const make = () => new PodTradeClient({ restUrl: "http://node.test/v1", wsUrl: "ws://node.test/v1", WebSocket: FakeWebSocket as never,
    claimRpcUrl: "http://arb.test", fetch: fetchFn as unknown as typeof fetch });

  it("reads the bridge named by the node's config, by the chain's clock, and answers both sides", async () => {
    const c = make();
    try {
      // Both windows began at t=1000s; the block says 172_800s, so each may also open the next.
      expect(await c.bridgeLimits()).toEqual({ deposit: { available: 3_999_000_000n }, claim: { available: 1_215_007_182n } });
      // The config is the client's cached resource: a second call asks the node once in all.
      await c.bridgeLimits();
      expect(fetchFn.mock.calls.filter(([u]) => String(u).endsWith("/bridge/config"))).toHaveLength(1);
    } finally {
      c.close();
    }
  });

  it("says which thing is missing", async () => {
    const c = make();
    try {
      await expect(c.bridgeLimits("0x9999999999999999999999999999999999999999" as Address)).rejects.toThrow(/is not bridged/);
    } finally {
      c.close();
    }
    const bare = client();
    try {
      await expect(bare.bridgeLimits()).rejects.toThrow(/claimRpcUrl/);
    } finally {
      bare.close();
    }
  });
});
