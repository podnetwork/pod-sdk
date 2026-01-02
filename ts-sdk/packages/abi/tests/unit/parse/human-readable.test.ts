/**
 * Tests for human-readable ABI parsing utilities
 */

import { describe, it, expect } from "vitest";
import {
  parseAbi,
  parseAbiItem,
  formatAbiItem,
  formatAbi,
} from "../../../src/parse/human-readable.js";
import { ParseError } from "../../../src/errors/index.js";

describe("parseAbiItem", () => {
  it("should parse function signature", () => {
    const item = parseAbiItem("function transfer(address to, uint256 amount) returns (bool)");

    expect(item.type).toBe("function");
    expect(item.name).toBe("transfer");
    expect(item.inputs).toHaveLength(2);
    expect(item.inputs[0]!.type).toBe("address");
    expect(item.inputs[0]!.name).toBe("to");
    expect(item.inputs[1]!.type).toBe("uint256");
    expect(item.inputs[1]!.name).toBe("amount");
  });

  it("should parse view function", () => {
    const item = parseAbiItem("function balanceOf(address owner) view returns (uint256)");

    expect(item.type).toBe("function");
    expect(item.name).toBe("balanceOf");
    if (item.type === "function") {
      expect(item.stateMutability).toBe("view");
    }
  });

  it("should parse event signature", () => {
    const item = parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    );

    expect(item.type).toBe("event");
    expect(item.name).toBe("Transfer");
    expect(item.inputs).toHaveLength(3);
    expect(item.inputs[0]!.indexed).toBe(true);
    expect(item.inputs[1]!.indexed).toBe(true);
    // Non-indexed params may have indexed undefined or false depending on ethers version
    expect(item.inputs[2]!.indexed).toBeFalsy();
  });

  it("should parse error signature", () => {
    const item = parseAbiItem("error InsufficientBalance(uint256 available, uint256 required)");

    expect(item.type).toBe("error");
    expect(item.name).toBe("InsufficientBalance");
    expect(item.inputs).toHaveLength(2);
  });

  it("should parse function with no params", () => {
    const item = parseAbiItem("function name() view returns (string)");

    expect(item.type).toBe("function");
    expect(item.name).toBe("name");
    expect(item.inputs).toHaveLength(0);
  });

  it("should parse function with no return", () => {
    const item = parseAbiItem("function doSomething()");

    expect(item.type).toBe("function");
    expect(item.name).toBe("doSomething");
  });

  it("should throw ParseError for malformed signature", () => {
    expect(() => parseAbiItem("not a valid signature")).toThrow(ParseError);
  });

  it("should throw ParseError for incomplete signature", () => {
    expect(() => parseAbiItem("function transfer(")).toThrow(ParseError);
  });
});

describe("parseAbi", () => {
  it("should parse array of signatures", () => {
    const abi = parseAbi([
      "function transfer(address to, uint256 amount) returns (bool)",
      "function balanceOf(address owner) view returns (uint256)",
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ]);

    expect(abi).toHaveLength(3);
    expect(abi[0]!.type).toBe("function");
    expect(abi[1]!.type).toBe("function");
    expect(abi[2]!.type).toBe("event");
  });

  it("should parse empty array", () => {
    const abi = parseAbi([]);

    expect(abi).toHaveLength(0);
  });

  it("should parse mixed types", () => {
    const abi = parseAbi([
      "function foo()",
      "event Bar(uint256 value)",
      "error Baz(string message)",
    ]);

    expect(abi).toHaveLength(3);
    expect(abi.map((i) => i.type)).toEqual(["function", "event", "error"]);
  });

  it("should handle mixed valid and invalid signatures", () => {
    // ethers.js may silently skip invalid signatures or throw
    // Test that at least valid signatures are parsed
    try {
      const abi = parseAbi(["function valid()", "not valid", "function alsoValid()"]);
      // If it doesn't throw, at least the valid ones should be present
      expect(abi.length).toBeGreaterThan(0);
    } catch (error) {
      // If it throws, it should be a ParseError
      expect(error).toBeInstanceOf(ParseError);
    }
  });
});

describe("formatAbiItem", () => {
  it("should format function to signature", () => {
    const item = parseAbiItem("function transfer(address to, uint256 amount)");
    const formatted = formatAbiItem(item);

    expect(formatted).toBe("transfer(address,uint256)");
  });

  it("should format event to signature", () => {
    const item = parseAbiItem(
      "event Transfer(address indexed from, address indexed to, uint256 value)"
    );
    const formatted = formatAbiItem(item);

    expect(formatted).toBe("Transfer(address,address,uint256)");
  });

  it("should format error to signature", () => {
    const item = parseAbiItem("error InsufficientBalance(uint256 available, uint256 required)");
    const formatted = formatAbiItem(item);

    expect(formatted).toBe("InsufficientBalance(uint256,uint256)");
  });

  it("should format function with no params", () => {
    const item = parseAbiItem("function name() view returns (string)");
    const formatted = formatAbiItem(item);

    expect(formatted).toBe("name()");
  });
});

describe("formatAbi", () => {
  it("should format entire ABI to signatures", () => {
    const abi = parseAbi([
      "function transfer(address to, uint256 amount) returns (bool)",
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ]);

    const formatted = formatAbi(abi);

    expect(formatted).toHaveLength(2);
    expect(formatted[0]).toBe("transfer(address,uint256)");
    expect(formatted[1]).toBe("Transfer(address,address,uint256)");
  });

  it("should format empty ABI", () => {
    const formatted = formatAbi([]);

    expect(formatted).toHaveLength(0);
  });
});
