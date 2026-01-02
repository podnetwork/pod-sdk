/**
 * Tests for constructor encoding utilities
 */

import { describe, it, expect } from "vitest";
import { AbiCoder } from "ethers";
import type { Abi } from "abitype";
import {
  encodeConstructor,
  hasConstructorParams,
  getConstructorParamCount,
} from "../../../src/encode/constructor.js";
import { FunctionNotFoundError } from "../../../src/errors/index.js";

// ABI with parameterized constructor
const TOKEN_ABI: Abi = [
  {
    type: "constructor",
    inputs: [
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "decimals", type: "uint8" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
];

// ABI with no constructor (implicit default)
const NO_CONSTRUCTOR_ABI: Abi = [
  {
    type: "function",
    name: "doSomething",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

// ABI with explicit empty constructor
const EMPTY_CONSTRUCTOR_ABI: Abi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "doSomething",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

describe("encodeConstructor", () => {
  it("should encode constructor with string and uint8 args", () => {
    const name = "Test Token";
    const symbol = "TEST";
    const decimals = 18;

    const encoded = encodeConstructor(TOKEN_ABI, [name, symbol, decimals]);

    // Should be ABI-encoded data (no selector for constructor)
    expect(encoded.startsWith("0x")).toBe(true);
    expect(encoded.length).toBeGreaterThan(2);
  });

  it("should produce valid encoded data that can be decoded", () => {
    const name = "My Token";
    const symbol = "MTK";
    const decimals = 6;

    const encoded = encodeConstructor(TOKEN_ABI, [name, symbol, decimals]);

    // Verify structure using AbiCoder directly
    const abiCoder = AbiCoder.defaultAbiCoder();
    const decoded = abiCoder.decode(["string", "string", "uint8"], encoded);

    expect(decoded[0]).toBe(name);
    expect(decoded[1]).toBe(symbol);
    expect(decoded[2]).toBe(BigInt(decimals));
  });

  it("should encode empty constructor", () => {
    const encoded = encodeConstructor(EMPTY_CONSTRUCTOR_ABI, []);

    // Empty constructor should return just 0x
    expect(encoded).toBe("0x");
  });

  it("should encode implicit default constructor", () => {
    const encoded = encodeConstructor(NO_CONSTRUCTOR_ABI, []);

    expect(encoded).toBe("0x");
  });

  it("should throw when providing args to parameterless constructor", () => {
    expect(() => encodeConstructor(NO_CONSTRUCTOR_ABI, ["unexpected", "args"])).toThrow(
      FunctionNotFoundError
    );
  });
});

describe("hasConstructorParams", () => {
  it("should return true for ABI with constructor params", () => {
    expect(hasConstructorParams(TOKEN_ABI)).toBe(true);
  });

  it("should return false for ABI with no constructor", () => {
    expect(hasConstructorParams(NO_CONSTRUCTOR_ABI)).toBe(false);
  });

  it("should return false for ABI with empty constructor", () => {
    expect(hasConstructorParams(EMPTY_CONSTRUCTOR_ABI)).toBe(false);
  });
});

describe("getConstructorParamCount", () => {
  it("should return correct count for parameterized constructor", () => {
    expect(getConstructorParamCount(TOKEN_ABI)).toBe(3);
  });

  it("should return 0 for ABI with no constructor", () => {
    expect(getConstructorParamCount(NO_CONSTRUCTOR_ABI)).toBe(0);
  });

  it("should return 0 for empty constructor", () => {
    expect(getConstructorParamCount(EMPTY_CONSTRUCTOR_ABI)).toBe(0);
  });
});
