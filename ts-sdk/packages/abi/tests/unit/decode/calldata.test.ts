/**
 * Tests for calldata decoding utilities
 */

import { describe, it, expect } from "vitest";
import { Interface } from "ethers";
import type { Abi } from "abitype";
import {
  decodeCalldata,
  decodeFunction,
  decodeReturnValue,
  decodeFunctionResult,
} from "../../../src/decode/calldata.js";
import { FunctionNotFoundError } from "../../../src/errors/index.js";
import { ERC20_ABI } from "../../../src/abis/common/erc20.js";

type Hex = `0x${string}`;

// Create encoded function calldata
function encodeFunction(functionName: string, args: unknown[]): Hex {
  const iface = new Interface(ERC20_ABI as unknown as Abi);
  return iface.encodeFunctionData(functionName, args) as Hex;
}

// Create encoded return data
function encodeReturnData(types: string[], values: unknown[]): Hex {
  const iface = new Interface([
    {
      type: "function",
      name: "test",
      inputs: [],
      outputs: types.map((t, i) => ({ name: `ret${String(i)}`, type: t })),
      stateMutability: "view",
    },
  ]);
  const fn = iface.getFunction("test");
  return iface.encodeFunctionResult(fn!, values) as Hex;
}

describe("decodeCalldata", () => {
  it("should decode transfer function", () => {
    const to = "0x1234567890123456789012345678901234567890";
    const value = 1000000000000000000n;
    const data = encodeFunction("transfer", [to, value]);

    const decoded = decodeCalldata(ERC20_ABI as unknown as Abi, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.functionName).toBe("transfer");
    expect(decoded!.args.to.toLowerCase()).toBe(to.toLowerCase());
    expect(decoded!.args.value).toBe(value);
  });

  it("should decode balanceOf function", () => {
    const account = "0x1234567890123456789012345678901234567890";
    const data = encodeFunction("balanceOf", [account]);

    const decoded = decodeCalldata(ERC20_ABI as unknown as Abi, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.functionName).toBe("balanceOf");
    expect(decoded!.args.account.toLowerCase()).toBe(account.toLowerCase());
  });

  it("should decode approve function", () => {
    const spender = "0x1234567890123456789012345678901234567890";
    const value = 999n;
    const data = encodeFunction("approve", [spender, value]);

    const decoded = decodeCalldata(ERC20_ABI as unknown as Abi, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.functionName).toBe("approve");
    expect(decoded!.args.spender.toLowerCase()).toBe(spender.toLowerCase());
    expect(decoded!.args.value).toBe(value);
  });

  it("should return null for unknown selector", () => {
    const data = ("0x" + "aa".repeat(4) + "bb".repeat(32)) as Hex;

    const decoded = decodeCalldata(ERC20_ABI as unknown as Abi, data);

    expect(decoded).toBeNull();
  });

  it("should return null for data too short", () => {
    const data = "0x1234" as Hex;

    const decoded = decodeCalldata(ERC20_ABI as unknown as Abi, data);

    expect(decoded).toBeNull();
  });

  it("should include selector in decoded result", () => {
    const data = encodeFunction("transfer", ["0x1234567890123456789012345678901234567890", 100n]);

    const decoded = decodeCalldata(ERC20_ABI as unknown as Abi, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.selector).toBe(data.slice(0, 10));
  });

  it("should include positional argsList", () => {
    const to = "0x1234567890123456789012345678901234567890";
    const value = 100n;
    const data = encodeFunction("transfer", [to, value]);

    const decoded = decodeCalldata(ERC20_ABI as unknown as Abi, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.argsList).toHaveLength(2);
    expect(decoded!.argsList[1]).toBe(value);
  });
});

describe("decodeFunction", () => {
  it("should be an alias for decodeCalldata", () => {
    const data = encodeFunction("transfer", ["0x1234567890123456789012345678901234567890", 100n]);

    const decoded = decodeFunction(ERC20_ABI as unknown as Abi, data);

    expect(decoded).not.toBeNull();
    expect(decoded!.functionName).toBe("transfer");
  });
});

describe("decodeReturnValue", () => {
  it("should decode single return value", () => {
    const returnData = encodeReturnData(["uint256"], [1000n]);

    const result = decodeReturnValue(ERC20_ABI as unknown as Abi, "balanceOf", returnData);

    expect(result).toBe(1000n);
  });

  it("should decode boolean return value", () => {
    const returnData = encodeReturnData(["bool"], [true]);

    const result = decodeReturnValue(ERC20_ABI as unknown as Abi, "transfer", returnData);

    expect(result).toBe(true);
  });

  it("should throw FunctionNotFoundError for unknown function", () => {
    const returnData = "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

    expect(() => decodeReturnValue(ERC20_ABI as unknown as Abi, "nonexistent", returnData)).toThrow(
      FunctionNotFoundError
    );
  });
});

describe("decodeFunctionResult", () => {
  it("should be an alias for decodeReturnValue", () => {
    const returnData = encodeReturnData(["uint256"], [999n]);

    const result = decodeFunctionResult(ERC20_ABI as unknown as Abi, "balanceOf", returnData);

    expect(result).toBe(999n);
  });
});
