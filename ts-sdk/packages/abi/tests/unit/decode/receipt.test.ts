/**
 * Tests for receipt log decoding utilities
 */

import { describe, it, expect } from "vitest";
import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";
import type { Abi } from "abitype";
import {
  decodeReceiptLogs,
  decodeReceiptLogsWithUnknown,
  isDecodedEventLog,
  isUnknownLog,
} from "../../../src/decode/receipt.js";
import { ERC20_ABI } from "../../../src/abis/common/erc20.js";

type Address = `0x${string}`;
type Hex = `0x${string}`;

const TRANSFER_TOPIC = keccak256(toUtf8Bytes("Transfer(address,address,uint256)")) as Hex;

function createLog(
  topic: Hex,
  address: Address,
  indexedArgs: Hex[],
  data: Hex
): { address: Address; topics: readonly Hex[]; data: Hex } {
  return {
    address,
    topics: [topic, ...indexedArgs],
    data,
  };
}

function createTransferLog(
  from: Address,
  to: Address,
  value: bigint
): {
  address: Address;
  topics: readonly Hex[];
  data: Hex;
} {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const fromTopic = ("0x" + from.slice(2).padStart(64, "0")) as Hex;
  const toTopic = ("0x" + to.slice(2).padStart(64, "0")) as Hex;
  const data = abiCoder.encode(["uint256"], [value]) as Hex;

  return createLog(
    TRANSFER_TOPIC,
    "0x1234567890123456789012345678901234567890" as Address,
    [fromTopic, toTopic],
    data
  );
}

function createUnknownLog(): {
  address: Address;
  topics: readonly Hex[];
  data: Hex;
} {
  return {
    address: "0x1234567890123456789012345678901234567890" as Address,
    topics: [("0x" + "ab".repeat(32)) as Hex],
    data: "0x" as Hex,
  };
}

describe("decodeReceiptLogs", () => {
  it("should decode known logs", () => {
    const logs = [
      createTransferLog(
        "0x1111111111111111111111111111111111111111" as Address,
        "0x2222222222222222222222222222222222222222" as Address,
        1000n
      ),
    ];

    const decoded = decodeReceiptLogs(logs, {
      abis: [ERC20_ABI as unknown as Abi],
    });

    expect(decoded).toHaveLength(1);
    expect(decoded[0]!.eventName).toBe("Transfer");
  });

  it("should skip unknown logs by default", () => {
    const logs = [
      createTransferLog(
        "0x1111111111111111111111111111111111111111" as Address,
        "0x2222222222222222222222222222222222222222" as Address,
        1000n
      ),
      createUnknownLog(),
    ];

    const decoded = decodeReceiptLogs(logs, {
      abis: [ERC20_ABI as unknown as Abi],
    });

    expect(decoded).toHaveLength(1);
  });

  it("should decode multiple known logs", () => {
    const logs = [
      createTransferLog(
        "0x1111111111111111111111111111111111111111" as Address,
        "0x2222222222222222222222222222222222222222" as Address,
        1000n
      ),
      createTransferLog(
        "0x3333333333333333333333333333333333333333" as Address,
        "0x4444444444444444444444444444444444444444" as Address,
        2000n
      ),
    ];

    const decoded = decodeReceiptLogs(logs, {
      abis: [ERC20_ABI as unknown as Abi],
    });

    expect(decoded).toHaveLength(2);
    expect(decoded[0]!.eventName).toBe("Transfer");
    expect(decoded[1]!.eventName).toBe("Transfer");
  });

  it("should try multiple ABIs", () => {
    const customAbi: Abi = [
      {
        type: "event",
        name: "CustomEvent",
        inputs: [{ name: "value", type: "uint256", indexed: false }],
        anonymous: false,
      },
    ];

    const logs = [
      createTransferLog(
        "0x1111111111111111111111111111111111111111" as Address,
        "0x2222222222222222222222222222222222222222" as Address,
        1000n
      ),
    ];

    const decoded = decodeReceiptLogs(logs, {
      abis: [customAbi, ERC20_ABI as unknown as Abi],
    });

    expect(decoded).toHaveLength(1);
    expect(decoded[0]!.eventName).toBe("Transfer");
  });

  it("should return empty array for no logs", () => {
    const decoded = decodeReceiptLogs([], {
      abis: [ERC20_ABI as unknown as Abi],
    });

    expect(decoded).toHaveLength(0);
  });
});

describe("decodeReceiptLogsWithUnknown", () => {
  it("should include unknown logs in output", () => {
    const logs = [
      createTransferLog(
        "0x1111111111111111111111111111111111111111" as Address,
        "0x2222222222222222222222222222222222222222" as Address,
        1000n
      ),
      createUnknownLog(),
    ];

    const decoded = decodeReceiptLogsWithUnknown(logs, {
      abis: [ERC20_ABI as unknown as Abi],
    });

    expect(decoded).toHaveLength(2);
  });

  it("should mark decoded events correctly", () => {
    const logs = [
      createTransferLog(
        "0x1111111111111111111111111111111111111111" as Address,
        "0x2222222222222222222222222222222222222222" as Address,
        1000n
      ),
    ];

    const decoded = decodeReceiptLogsWithUnknown(logs, {
      abis: [ERC20_ABI as unknown as Abi],
    });

    expect(isDecodedEventLog(decoded[0]!)).toBe(true);
    expect(isUnknownLog(decoded[0]!)).toBe(false);
  });

  it("should mark unknown logs correctly", () => {
    const logs = [createUnknownLog()];

    const decoded = decodeReceiptLogsWithUnknown(logs, {
      abis: [ERC20_ABI as unknown as Abi],
    });

    expect(isUnknownLog(decoded[0]!)).toBe(true);
    expect(isDecodedEventLog(decoded[0]!)).toBe(false);
  });

  it("should preserve original log in unknown wrapper", () => {
    const unknownLog = createUnknownLog();
    const logs = [unknownLog];

    const decoded = decodeReceiptLogsWithUnknown(logs, {
      abis: [ERC20_ABI as unknown as Abi],
    });

    if (isUnknownLog(decoded[0]!)) {
      expect(decoded[0].log).toEqual(unknownLog);
    } else {
      throw new Error("Expected unknown log");
    }
  });
});

describe("type guards", () => {
  it("isDecodedEventLog should return true for decoded events", () => {
    const decoded = {
      eventName: "Transfer",
      args: {},
      argsList: [],
      topic: TRANSFER_TOPIC,
      address: "0x1234567890123456789012345678901234567890" as Address,
    };

    expect(isDecodedEventLog(decoded)).toBe(true);
  });

  it("isUnknownLog should return true for unknown logs", () => {
    const unknown = {
      decoded: false as const,
      log: createUnknownLog(),
    };

    expect(isUnknownLog(unknown)).toBe(true);
  });
});
