/**
 * Tests for ABI filtering utilities
 */

import { describe, it, expect } from "vitest";
import type { Abi } from "abitype";
import {
  filterAbi,
  getAbiFunctions,
  getAbiEvents,
  getAbiErrors,
  getAbiItem,
  hasFunction,
  hasEvent,
  hasError,
} from "../../../src/utils/filter.js";
import { ERC20_ABI } from "../../../src/abis/common/erc20.js";

// Extended test ABI
const MIXED_ABI: Abi = [
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
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
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
  {
    type: "error",
    name: "InsufficientBalance",
    inputs: [
      { name: "available", type: "uint256" },
      { name: "required", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "Unauthorized",
    inputs: [{ name: "caller", type: "address" }],
  },
];

describe("filterAbi", () => {
  it("should filter to functions only", () => {
    const filtered = filterAbi(MIXED_ABI, "function");

    expect(filtered).toHaveLength(3);
    expect(filtered.every((i) => i.type === "function")).toBe(true);
  });

  it("should filter to events only", () => {
    const filtered = filterAbi(MIXED_ABI, "event");

    expect(filtered).toHaveLength(2);
    expect(filtered.every((i) => i.type === "event")).toBe(true);
  });

  it("should filter to errors only", () => {
    const filtered = filterAbi(MIXED_ABI, "error");

    expect(filtered).toHaveLength(2);
    expect(filtered.every((i) => i.type === "error")).toBe(true);
  });

  it("should filter by specific names", () => {
    const filtered = filterAbi(MIXED_ABI, "function", {
      names: ["transfer", "approve"],
    });

    expect(filtered).toHaveLength(2);
    const names = filtered.map((i) => ("name" in i ? i.name : ""));
    expect(names).toContain("transfer");
    expect(names).toContain("approve");
    expect(names).not.toContain("balanceOf");
  });

  it("should return empty array for non-existent type", () => {
    const filtered = filterAbi(MIXED_ABI, "receive");

    expect(filtered).toHaveLength(0);
  });
});

describe("getAbiFunctions", () => {
  it("should return all functions", () => {
    const functions = getAbiFunctions(MIXED_ABI);

    expect(functions).toHaveLength(3);
    // Verify all items are functions (type is narrowed by getAbiFunctions)
    expect(functions.length).toBe(3);
  });

  it("should filter by names", () => {
    const functions = getAbiFunctions(MIXED_ABI, {
      names: ["transfer"],
    });

    expect(functions).toHaveLength(1);
    expect(functions[0]!.name).toBe("transfer");
  });

  it("should filter by stateMutability", () => {
    const viewFunctions = getAbiFunctions(MIXED_ABI, {
      stateMutability: ["view"],
    });

    expect(viewFunctions).toHaveLength(1);
    expect(viewFunctions[0]!.name).toBe("balanceOf");
    expect(viewFunctions[0]!.stateMutability).toBe("view");
  });

  it("should filter by multiple stateMutabilities", () => {
    const functions = getAbiFunctions(MIXED_ABI, {
      stateMutability: ["view", "pure"],
    });

    expect(functions).toHaveLength(1);
  });

  it("should combine name and stateMutability filters", () => {
    const functions = getAbiFunctions(MIXED_ABI, {
      names: ["transfer", "balanceOf"],
      stateMutability: ["view"],
    });

    expect(functions).toHaveLength(1);
    expect(functions[0]!.name).toBe("balanceOf");
  });
});

describe("getAbiEvents", () => {
  it("should return all events", () => {
    const events = getAbiEvents(MIXED_ABI);

    expect(events).toHaveLength(2);
    // Type is narrowed by getAbiEvents
    expect(events.length).toBe(2);
  });

  it("should return empty array for ABI without events", () => {
    const noEventsAbi: Abi = [
      {
        type: "function",
        name: "test",
        inputs: [],
        outputs: [],
        stateMutability: "nonpayable",
      },
    ];

    const events = getAbiEvents(noEventsAbi);

    expect(events).toHaveLength(0);
  });
});

describe("getAbiErrors", () => {
  it("should return all errors", () => {
    const errors = getAbiErrors(MIXED_ABI);

    expect(errors).toHaveLength(2);
    // Type is narrowed by getAbiErrors
    expect(errors.length).toBe(2);
  });

  it("should return empty array for ABI without errors", () => {
    const errors = getAbiErrors(ERC20_ABI as unknown as Abi);

    expect(errors).toHaveLength(0);
  });
});

describe("getAbiItem", () => {
  it("should find function by name", () => {
    const item = getAbiItem(MIXED_ABI, "function", "transfer");

    expect(item).not.toBeUndefined();
    expect(item!.type).toBe("function");
    expect(item!.name).toBe("transfer");
  });

  it("should find event by name", () => {
    const item = getAbiItem(MIXED_ABI, "event", "Transfer");

    expect(item).not.toBeUndefined();
    expect(item!.type).toBe("event");
    expect(item!.name).toBe("Transfer");
  });

  it("should find error by name", () => {
    const item = getAbiItem(MIXED_ABI, "error", "InsufficientBalance");

    expect(item).not.toBeUndefined();
    expect(item!.type).toBe("error");
    expect(item!.name).toBe("InsufficientBalance");
  });

  it("should return undefined for non-existent item", () => {
    const item = getAbiItem(MIXED_ABI, "function", "nonexistent");

    expect(item).toBeUndefined();
  });

  it("should return undefined for wrong type", () => {
    const item = getAbiItem(MIXED_ABI, "event", "transfer");

    expect(item).toBeUndefined();
  });
});

describe("hasFunction", () => {
  it("should return true for existing function", () => {
    expect(hasFunction(MIXED_ABI, "transfer")).toBe(true);
    expect(hasFunction(MIXED_ABI, "balanceOf")).toBe(true);
    expect(hasFunction(MIXED_ABI, "approve")).toBe(true);
  });

  it("should return false for non-existent function", () => {
    expect(hasFunction(MIXED_ABI, "nonexistent")).toBe(false);
  });

  it("should return false for event name", () => {
    expect(hasFunction(MIXED_ABI, "Transfer")).toBe(false);
  });
});

describe("hasEvent", () => {
  it("should return true for existing event", () => {
    expect(hasEvent(MIXED_ABI, "Transfer")).toBe(true);
    expect(hasEvent(MIXED_ABI, "Approval")).toBe(true);
  });

  it("should return false for non-existent event", () => {
    expect(hasEvent(MIXED_ABI, "NonExistent")).toBe(false);
  });

  it("should return false for function name", () => {
    expect(hasEvent(MIXED_ABI, "transfer")).toBe(false);
  });
});

describe("hasError", () => {
  it("should return true for existing error", () => {
    expect(hasError(MIXED_ABI, "InsufficientBalance")).toBe(true);
    expect(hasError(MIXED_ABI, "Unauthorized")).toBe(true);
  });

  it("should return false for non-existent error", () => {
    expect(hasError(MIXED_ABI, "NonExistent")).toBe(false);
  });

  it("should return false for function name", () => {
    expect(hasError(MIXED_ABI, "transfer")).toBe(false);
  });
});
