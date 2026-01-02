/**
 * Tests for error decoding utilities
 */

import { describe, it, expect } from "vitest";
import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";
import type { Abi } from "abitype";
import {
  decodeError,
  isError,
  getErrorSelector,
  getErrorSelectors,
} from "../../../src/decode/errors.js";
import { ErrorNotFoundError } from "../../../src/errors/index.js";

type Hex = `0x${string}`;

// Test ABI with custom errors
const ERROR_ABI: Abi = [
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
  {
    type: "error",
    name: "EmptyError",
    inputs: [],
  },
];

// Create encoded error data
function encodeError(name: string, types: string[], values: unknown[]): Hex {
  const signature = `${name}(${types.join(",")})`;
  const selector = keccak256(toUtf8Bytes(signature)).slice(0, 10);
  const abiCoder = AbiCoder.defaultAbiCoder();
  const encodedArgs = abiCoder.encode(types, values);
  return (selector + encodedArgs.slice(2)) as Hex;
}

describe("decodeError", () => {
  it("should decode InsufficientBalance error", () => {
    const data = encodeError("InsufficientBalance", ["uint256", "uint256"], [100n, 200n]);

    const decoded = decodeError(ERROR_ABI, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.errorName).toBe("InsufficientBalance");
    expect(decoded!.args.available).toBe(100n);
    expect(decoded!.args.required).toBe(200n);
    expect(decoded!.argsList).toEqual([100n, 200n]);
  });

  it("should decode Unauthorized error with address", () => {
    const caller = "0x1234567890123456789012345678901234567890";
    const data = encodeError("Unauthorized", ["address"], [caller]);

    const decoded = decodeError(ERROR_ABI, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.errorName).toBe("Unauthorized");
    expect(decoded!.args.caller.toLowerCase()).toBe(caller.toLowerCase());
  });

  it("should decode error with no arguments", () => {
    const data = encodeError("EmptyError", [], []);

    const decoded = decodeError(ERROR_ABI, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.errorName).toBe("EmptyError");
    expect(decoded!.args).toEqual({});
    expect(decoded!.argsList).toEqual([]);
  });

  it("should return null for unknown error selector", () => {
    const data = ("0x" + "aa".repeat(4) + "bb".repeat(32)) as Hex;

    const decoded = decodeError(ERROR_ABI, data);

    expect(decoded).toBeNull();
  });

  it("should return null for data too short", () => {
    const data = "0x1234" as Hex;

    const decoded = decodeError(ERROR_ABI, data);

    expect(decoded).toBeNull();
  });

  it("should include selector and original data in decoded result", () => {
    const data = encodeError("InsufficientBalance", ["uint256", "uint256"], [100n, 200n]);

    const decoded = decodeError(ERROR_ABI, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.selector).toBe(data.slice(0, 10));
    expect(decoded!.data).toBe(data);
  });
});

describe("isError", () => {
  it("should return true for matching error", () => {
    const data = encodeError("InsufficientBalance", ["uint256", "uint256"], [100n, 200n]);

    expect(isError(ERROR_ABI, data, "InsufficientBalance")).toBe(true);
  });

  it("should return false for non-matching error name", () => {
    const data = encodeError("InsufficientBalance", ["uint256", "uint256"], [100n, 200n]);

    expect(isError(ERROR_ABI, data, "Unauthorized")).toBe(false);
  });

  it("should return false for unknown error", () => {
    const data = ("0x" + "aa".repeat(4) + "bb".repeat(32)) as Hex;

    expect(isError(ERROR_ABI, data, "InsufficientBalance")).toBe(false);
  });
});

describe("getErrorSelector", () => {
  it("should return correct selector for error", () => {
    const expectedSelector = keccak256(toUtf8Bytes("InsufficientBalance(uint256,uint256)")).slice(
      0,
      10
    );

    const selector = getErrorSelector(ERROR_ABI, "InsufficientBalance");

    expect(selector).toBe(expectedSelector);
  });

  it("should throw ErrorNotFoundError for unknown error", () => {
    expect(() => getErrorSelector(ERROR_ABI, "NonExistent")).toThrow(ErrorNotFoundError);
  });
});

describe("getErrorSelectors", () => {
  it("should return map of all error selectors", () => {
    const selectors = getErrorSelectors(ERROR_ABI);

    expect(selectors.size).toBe(3);

    const insufficientSelector = keccak256(
      toUtf8Bytes("InsufficientBalance(uint256,uint256)")
    ).slice(0, 10) as Hex;
    expect(selectors.get(insufficientSelector)).toBe("InsufficientBalance");
  });
});
