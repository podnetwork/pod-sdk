/**
 * Tests for function encoding utilities
 */

import { describe, it, expect } from "vitest";
import { Interface, keccak256, toUtf8Bytes } from "ethers";
import type { Abi } from "abitype";
import {
  encodeFunction,
  getFunctionSelector,
  getFunctionSelectors,
} from "../../../src/encode/function.js";
import { FunctionNotFoundError } from "../../../src/errors/index.js";
import { ERC20_ABI } from "../../../src/abis/common/erc20.js";

type Hex = `0x${string}`;

describe("encodeFunction", () => {
  it("should encode transfer function", () => {
    const to = "0x1234567890123456789012345678901234567890";
    const value = 1000000000000000000n;

    const encoded = encodeFunction(ERC20_ABI as unknown as Abi, "transfer", [to, value]);

    // Verify it starts with the correct selector
    const expectedSelector = keccak256(toUtf8Bytes("transfer(address,uint256)")).slice(0, 10);
    expect(encoded.slice(0, 10)).toBe(expectedSelector);
  });

  it("should encode balanceOf function", () => {
    const account = "0x1234567890123456789012345678901234567890";

    const encoded = encodeFunction(ERC20_ABI as unknown as Abi, "balanceOf", [account]);

    const expectedSelector = keccak256(toUtf8Bytes("balanceOf(address)")).slice(0, 10);
    expect(encoded.slice(0, 10)).toBe(expectedSelector);
  });

  it("should encode approve function", () => {
    const spender = "0x1234567890123456789012345678901234567890";
    const value = 999n;

    const encoded = encodeFunction(ERC20_ABI as unknown as Abi, "approve", [spender, value]);

    const expectedSelector = keccak256(toUtf8Bytes("approve(address,uint256)")).slice(0, 10);
    expect(encoded.slice(0, 10)).toBe(expectedSelector);
  });

  it("should encode function with no arguments", () => {
    const encoded = encodeFunction(ERC20_ABI as unknown as Abi, "name", []);

    const expectedSelector = keccak256(toUtf8Bytes("name()")).slice(0, 10);
    expect(encoded).toBe(expectedSelector);
  });

  it("should throw FunctionNotFoundError for unknown function", () => {
    expect(() => encodeFunction(ERC20_ABI as unknown as Abi, "nonexistent", [])).toThrow(
      FunctionNotFoundError
    );
  });

  it("should handle overloaded functions with full signature", () => {
    const overloadedAbi: Abi = [
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
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
      },
    ];

    const encoded = encodeFunction(overloadedAbi, "transfer(address,uint256)", [
      "0x1234567890123456789012345678901234567890",
      100n,
    ]);

    const expectedSelector = keccak256(toUtf8Bytes("transfer(address,uint256)")).slice(0, 10);
    expect(encoded.slice(0, 10)).toBe(expectedSelector);
  });

  it("should throw for ambiguous function name", () => {
    const overloadedAbi: Abi = [
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
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "nonpayable",
      },
    ];

    // ethers.js throws TypeError for ambiguous functions
    expect(() =>
      encodeFunction(overloadedAbi, "transfer", [
        "0x1234567890123456789012345678901234567890",
        100n,
      ])
    ).toThrow(/ambiguous/i);
  });

  it("should produce valid calldata that can be decoded", () => {
    const to = "0x1234567890123456789012345678901234567890";
    const value = 12345n;

    const encoded = encodeFunction(ERC20_ABI as unknown as Abi, "transfer", [to, value]);

    // Decode to verify
    const iface = new Interface(ERC20_ABI as unknown as Abi);
    const decoded = iface.parseTransaction({ data: encoded });

    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe("transfer");
    expect(decoded!.args[1]).toBe(value);
  });
});

describe("getFunctionSelector", () => {
  it("should return correct selector for transfer", () => {
    const expectedSelector = keccak256(toUtf8Bytes("transfer(address,uint256)")).slice(
      0,
      10
    ) as Hex;

    const selector = getFunctionSelector(ERC20_ABI as unknown as Abi, "transfer");

    expect(selector).toBe(expectedSelector);
  });

  it("should return correct selector for balanceOf", () => {
    const expectedSelector = keccak256(toUtf8Bytes("balanceOf(address)")).slice(0, 10) as Hex;

    const selector = getFunctionSelector(ERC20_ABI as unknown as Abi, "balanceOf");

    expect(selector).toBe(expectedSelector);
  });

  it("should throw FunctionNotFoundError for unknown function", () => {
    expect(() => getFunctionSelector(ERC20_ABI as unknown as Abi, "nonexistent")).toThrow(
      FunctionNotFoundError
    );
  });

  it("should throw for overloaded function", () => {
    const overloadedAbi: Abi = [
      {
        type: "function",
        name: "transfer",
        inputs: [{ name: "to", type: "address" }],
        outputs: [],
        stateMutability: "nonpayable",
      },
      {
        type: "function",
        name: "transfer",
        inputs: [
          { name: "to", type: "address" },
          { name: "amount", type: "uint256" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
      },
    ];

    // ethers.js throws TypeError for ambiguous functions
    expect(() => getFunctionSelector(overloadedAbi, "transfer")).toThrow(/ambiguous/i);
  });
});

describe("getFunctionSelectors", () => {
  it("should return map of all function selectors", () => {
    const selectors = getFunctionSelectors(ERC20_ABI as unknown as Abi);

    // ERC20 has 9 functions
    expect(selectors.size).toBe(9);

    const transferSelector = keccak256(toUtf8Bytes("transfer(address,uint256)")).slice(
      0,
      10
    ) as Hex;
    expect(selectors.get(transferSelector)).toBe("transfer");
  });

  it("should include all ERC20 functions", () => {
    const selectors = getFunctionSelectors(ERC20_ABI as unknown as Abi);
    const names = Array.from(selectors.values());

    expect(names).toContain("name");
    expect(names).toContain("symbol");
    expect(names).toContain("decimals");
    expect(names).toContain("totalSupply");
    expect(names).toContain("balanceOf");
    expect(names).toContain("transfer");
    expect(names).toContain("allowance");
    expect(names).toContain("approve");
    expect(names).toContain("transferFrom");
  });
});
