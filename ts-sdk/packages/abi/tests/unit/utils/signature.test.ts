/**
 * Tests for signature computation utilities
 */

import { describe, it, expect } from "vitest";
import { keccak256, toUtf8Bytes } from "ethers";
import type { Abi, AbiFunction, AbiEvent, AbiError } from "abitype";
import {
  computeSelector,
  computeEventTopic,
  getSignature,
  getFunctionSignature,
  getEventSignature,
  getErrorSignature,
} from "../../../src/utils/signature.js";
import {
  FunctionNotFoundError,
  EventNotFoundError,
  ErrorNotFoundError,
} from "../../../src/errors/index.js";
import { ERC20_ABI } from "../../../src/abis/common/erc20.js";

describe("computeSelector", () => {
  it("should compute correct selector for transfer", () => {
    const selector = computeSelector("transfer(address,uint256)");
    const expected = keccak256(toUtf8Bytes("transfer(address,uint256)")).slice(0, 10);

    expect(selector).toBe(expected);
  });

  it("should compute correct selector for balanceOf", () => {
    const selector = computeSelector("balanceOf(address)");
    const expected = keccak256(toUtf8Bytes("balanceOf(address)")).slice(0, 10);

    expect(selector).toBe(expected);
  });

  it("should compute correct selector for function with no params", () => {
    const selector = computeSelector("name()");
    const expected = keccak256(toUtf8Bytes("name()")).slice(0, 10);

    expect(selector).toBe(expected);
  });

  it("should return 4-byte hex selector", () => {
    const selector = computeSelector("test(uint256)");

    expect(selector.startsWith("0x")).toBe(true);
    expect(selector.length).toBe(10); // 0x + 8 hex chars
  });
});

describe("computeEventTopic", () => {
  it("should compute correct topic for Transfer event", () => {
    const topic = computeEventTopic("Transfer(address,address,uint256)");
    const expected = keccak256(toUtf8Bytes("Transfer(address,address,uint256)"));

    expect(topic).toBe(expected);
  });

  it("should compute correct topic for Approval event", () => {
    const topic = computeEventTopic("Approval(address,address,uint256)");
    const expected = keccak256(toUtf8Bytes("Approval(address,address,uint256)"));

    expect(topic).toBe(expected);
  });

  it("should return 32-byte hex topic", () => {
    const topic = computeEventTopic("Test(uint256)");

    expect(topic.startsWith("0x")).toBe(true);
    expect(topic.length).toBe(66); // 0x + 64 hex chars
  });
});

describe("getSignature", () => {
  it("should get signature from function item", () => {
    const item: AbiFunction = {
      type: "function",
      name: "transfer",
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      outputs: [{ name: "", type: "bool" }],
      stateMutability: "nonpayable",
    };

    const sig = getSignature(item);

    expect(sig).toBe("transfer(address,uint256)");
  });

  it("should get signature from event item", () => {
    const item: AbiEvent = {
      type: "event",
      name: "Transfer",
      inputs: [
        { name: "from", type: "address", indexed: true },
        { name: "to", type: "address", indexed: true },
        { name: "value", type: "uint256", indexed: false },
      ],
      anonymous: false,
    };

    const sig = getSignature(item);

    expect(sig).toBe("Transfer(address,address,uint256)");
  });

  it("should get signature from error item", () => {
    const item: AbiError = {
      type: "error",
      name: "InsufficientBalance",
      inputs: [
        { name: "available", type: "uint256" },
        { name: "required", type: "uint256" },
      ],
    };

    const sig = getSignature(item);

    expect(sig).toBe("InsufficientBalance(uint256,uint256)");
  });

  it("should handle function with no params", () => {
    const item: AbiFunction = {
      type: "function",
      name: "name",
      inputs: [],
      outputs: [{ name: "", type: "string" }],
      stateMutability: "view",
    };

    const sig = getSignature(item);

    expect(sig).toBe("name()");
  });
});

describe("getFunctionSignature", () => {
  it("should get signature for transfer function", () => {
    const sig = getFunctionSignature(ERC20_ABI as unknown as Abi, "transfer");

    expect(sig).toBe("transfer(address,uint256)");
  });

  it("should get signature for balanceOf function", () => {
    const sig = getFunctionSignature(ERC20_ABI as unknown as Abi, "balanceOf");

    expect(sig).toBe("balanceOf(address)");
  });

  it("should throw FunctionNotFoundError for unknown function", () => {
    expect(() => getFunctionSignature(ERC20_ABI as unknown as Abi, "nonexistent")).toThrow(
      FunctionNotFoundError
    );
  });
});

describe("getEventSignature", () => {
  it("should get signature for Transfer event", () => {
    const sig = getEventSignature(ERC20_ABI as unknown as Abi, "Transfer");

    expect(sig).toBe("Transfer(address,address,uint256)");
  });

  it("should get signature for Approval event", () => {
    const sig = getEventSignature(ERC20_ABI as unknown as Abi, "Approval");

    expect(sig).toBe("Approval(address,address,uint256)");
  });

  it("should throw EventNotFoundError for unknown event", () => {
    expect(() => getEventSignature(ERC20_ABI as unknown as Abi, "NonExistent")).toThrow(
      EventNotFoundError
    );
  });
});

describe("getErrorSignature", () => {
  const ERROR_ABI: Abi = [
    {
      type: "error",
      name: "InsufficientBalance",
      inputs: [
        { name: "available", type: "uint256" },
        { name: "required", type: "uint256" },
      ],
    },
  ];

  it("should get signature for error", () => {
    const sig = getErrorSignature(ERROR_ABI, "InsufficientBalance");

    expect(sig).toBe("InsufficientBalance(uint256,uint256)");
  });

  it("should throw ErrorNotFoundError for unknown error", () => {
    expect(() => getErrorSignature(ERROR_ABI, "NonExistent")).toThrow(ErrorNotFoundError);
  });
});
