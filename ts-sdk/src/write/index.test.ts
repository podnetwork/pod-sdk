import { describe, expect, it, vi } from "vitest";

import { waitForReceipt } from "./index.js";
import type { Hash } from "../types/public.js";

const TX = `0x${"ab".repeat(32)}` as Hash;

/** Serves one `eth_getTransactionReceipt` result, then repeats it. */
function fakeReceipt(result: unknown) {
  return vi.fn(async () => ({ json: async () => ({ jsonrpc: "2.0", id: 1, result }) })) as unknown as typeof fetch;
}

const base = { status: "0x1", transactionHash: TX, gasUsed: "0xf4240" };

describe("waitForReceipt", () => {
  it("returns a receipt with no block rather than throwing", async () => {
    const fetchFn = fakeReceipt({ ...base, blockNumber: null, blockHash: null, transactionIndex: null });
    await expect(waitForReceipt("http://rpc", TX, { fetch: fetchFn, timeoutMs: 50 })).resolves.toEqual({
      status: "success",
      transactionHash: TX,
      blockNumber: null,
      gasUsed: 1_000_000n,
    });
  });

  it("reports the height for a sequenced tx", async () => {
    const fetchFn = fakeReceipt({ ...base, blockNumber: "0x1a4" });
    const r = await waitForReceipt("http://rpc", TX, { fetch: fetchFn, timeoutMs: 50 });
    expect(r.blockNumber).toBe(420n);
  });

  it("keeps polling while the node has no receipt", async () => {
    const fetchFn = fakeReceipt(null);
    await expect(waitForReceipt("http://rpc", TX, { fetch: fetchFn, timeoutMs: 10, pollMs: 1 })).rejects.toThrow(
      /timed out/,
    );
  });
});
