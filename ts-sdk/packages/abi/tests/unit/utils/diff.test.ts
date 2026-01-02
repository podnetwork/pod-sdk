/**
 * Tests for ABI comparison utilities
 */

import { describe, it, expect } from "vitest";
import type { Abi } from "abitype";
import { diffAbis, isBackwardsCompatible } from "../../../src/utils/diff.js";

// Base ABI v1
const V1_ABI: Abi = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
];

describe("diffAbis", () => {
  it("should detect no changes for identical ABIs", () => {
    const diff = diffAbis(V1_ABI, V1_ABI);

    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.unchanged).toHaveLength(3);
  });

  it("should detect added items", () => {
    const v2Abi: Abi = [
      ...V1_ABI,
      {
        type: "function",
        name: "approve",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
      },
    ];

    const diff = diffAbis(V1_ABI, v2Abi);

    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]!.name).toBe("approve");
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  it("should detect removed items", () => {
    const v2Abi: Abi = [
      {
        type: "function",
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
      },
      // balanceOf removed
      {
        type: "event",
        name: "Transfer",
        inputs: [
          { name: "from", type: "address", indexed: true },
          { name: "to", type: "address", indexed: true },
          { name: "value", type: "uint256", indexed: false },
        ],
        anonymous: false,
      },
    ];

    const diff = diffAbis(V1_ABI, v2Abi);

    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]!.name).toBe("balanceOf");
    expect(diff.added).toHaveLength(0);
  });

  it("should detect changed function signature", () => {
    const v2Abi: Abi = [
      {
        type: "function",
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "data", type: "bytes" }, // Added param
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
      },
      V1_ABI[1]!,
      V1_ABI[2]!,
    ];

    const diff = diffAbis(V1_ABI, v2Abi);

    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.name).toBe("transfer");
    expect(diff.changed[0]!.breaking).toBe(true);
  });

  it("should detect changed output types as breaking", () => {
    const v2Abi: Abi = [
      {
        type: "function",
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "uint256" }], // Changed from bool to uint256
        stateMutability: "nonpayable",
      },
      V1_ABI[1]!,
      V1_ABI[2]!,
    ];

    const diff = diffAbis(V1_ABI, v2Abi);

    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.breaking).toBe(true);
  });

  it("should detect view to nonpayable as breaking", () => {
    const v2Abi: Abi = [
      V1_ABI[0]!,
      {
        type: "function",
        name: "balanceOf",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "nonpayable", // Changed from view
      },
      V1_ABI[2]!,
    ];

    const diff = diffAbis(V1_ABI, v2Abi);

    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.name).toBe("balanceOf");
    expect(diff.changed[0]!.breaking).toBe(true);
  });

  it("should detect changed event indexed parameters", () => {
    const v2Abi: Abi = [
      V1_ABI[0]!,
      V1_ABI[1]!,
      {
        type: "event",
        name: "Transfer",
        inputs: [
          { name: "from", type: "address", indexed: true },
          { name: "to", type: "address", indexed: false }, // Changed from indexed
          { name: "value", type: "uint256", indexed: false },
        ],
        anonymous: false,
      },
    ];

    const diff = diffAbis(V1_ABI, v2Abi);

    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]!.name).toBe("Transfer");
    expect(diff.changed[0]!.breaking).toBe(true);
  });
});

describe("isBackwardsCompatible", () => {
  it("should return true for identical ABIs", () => {
    expect(isBackwardsCompatible(V1_ABI, V1_ABI)).toBe(true);
  });

  it("should return true for added items only", () => {
    const v2Abi: Abi = [
      ...V1_ABI,
      {
        type: "function",
        name: "approve",
        inputs: [
          { name: "spender", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
      },
    ];

    expect(isBackwardsCompatible(V1_ABI, v2Abi)).toBe(true);
  });

  it("should return false for removed items", () => {
    const v2Abi: Abi = [V1_ABI[0]!, V1_ABI[2]!];

    expect(isBackwardsCompatible(V1_ABI, v2Abi)).toBe(false);
  });

  it("should return false for breaking changes", () => {
    const v2Abi: Abi = [
      {
        type: "function",
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "extra", type: "bytes" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
      },
      V1_ABI[1]!,
      V1_ABI[2]!,
    ];

    expect(isBackwardsCompatible(V1_ABI, v2Abi)).toBe(false);
  });

  it("should return true for non-breaking output changes", () => {
    // Adding a new event (not removing or changing)
    const v2Abi: Abi = [
      ...V1_ABI,
      {
        type: "event",
        name: "Approval",
        inputs: [
          { name: "owner", type: "address", indexed: true },
          { name: "spender", type: "address", indexed: true },
          { name: "value", type: "uint256", indexed: false },
        ],
        anonymous: false,
      },
    ];

    expect(isBackwardsCompatible(V1_ABI, v2Abi)).toBe(true);
  });
});
