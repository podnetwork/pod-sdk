import { describe, expect, it, vi } from "vitest";

import { decodeFunctionData, getAddress, parseAbi } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { createDelegatedWallet } from "./delegation.js";
import { BRIDGE_ADDRESS, buildSubmitBatch, buildWithdraw, waitForReceipt } from "./index.js";
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

const WITHDRAW_ABI = parseAbi([
  "function withdraw(address token, address to, uint256 amount, uint128 deadline)",
]);
const TOKEN = getAddress("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
const RECIPIENT = getAddress("0x000000000000000000000000000000000c1a1111");

function withdrawTx() {
  return buildWithdraw({
    token: TOKEN,
    recipient: RECIPIENT,
    amount: 10n ** 18n,
    auctionIntervalUs: 500_000,
    deadline: 1_700_000_000_000,
  });
}

describe("buildWithdraw", () => {
  it("calls the bridge precompile, not the CLOB (ADR 0042)", () => {
    const tx = withdrawTx();
    expect(tx.to).toBe(BRIDGE_ADDRESS);
    expect(decodeFunctionData({ abi: WITHDRAW_ABI, data: tx.data })).toEqual({
      functionName: "withdraw",
      args: [TOKEN, RECIPIENT, 10n ** 18n, 1_700_000_000_000_000n],
    });
  });
});

describe("buildSubmitBatch", () => {
  it("refuses a leg aimed off the CLOB precompile", () => {
    expect(() => buildSubmitBatch([withdrawTx()])).toThrow(/CLOB calls only/);
  });
});

describe("delegated submit", () => {
  it("refuses a transaction aimed off the CLOB precompile", async () => {
    const master = privateKeyToAccount(generatePrivateKey());
    const wallet = await createDelegatedWallet({
      master: master.address,
      chainId: 1293,
      rpcUrl: "http://rpc.invalid",
      ttlMs: 60 * 60_000,
      signTypedData: (td) => master.signTypedData(td as never),
    });
    // Rejected before any RPC call: an unreachable rpcUrl would throw otherwise.
    await expect(wallet.submit(withdrawTx())).rejects.toThrow(/master wallet/);
  });
});
