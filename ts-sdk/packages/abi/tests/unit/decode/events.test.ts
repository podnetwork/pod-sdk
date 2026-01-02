/**
 * Tests for event log decoding utilities
 */

import { describe, it, expect } from "vitest";
import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";
import type { Abi } from "abitype";
import {
  decodeEventLog,
  decodeEventLogStrict,
  getEventTopic,
  getEventTopics,
  buildEventFilter,
} from "../../../src/decode/events.js";
import { EventNotFoundError, AnonymousEventError } from "../../../src/errors/index.js";
import { ERC20_ABI } from "../../../src/abis/common/erc20.js";

type Address = `0x${string}`;
type Hex = `0x${string}`;

// Transfer event topic
const TRANSFER_TOPIC = keccak256(toUtf8Bytes("Transfer(address,address,uint256)")) as Hex;

// Create a mock Transfer log
function createTransferLog(
  from: Address,
  to: Address,
  value: bigint,
  address: Address = "0x1234567890123456789012345678901234567890"
): { address: Address; topics: readonly Hex[]; data: Hex } {
  const abiCoder = AbiCoder.defaultAbiCoder();
  const fromTopic = ("0x" + from.slice(2).padStart(64, "0")) as Hex;
  const toTopic = ("0x" + to.slice(2).padStart(64, "0")) as Hex;
  const data = abiCoder.encode(["uint256"], [value]) as Hex;

  return {
    address,
    topics: [TRANSFER_TOPIC, fromTopic, toTopic],
    data,
  };
}

describe("decodeEventLog", () => {
  it("should decode Transfer event correctly", () => {
    const from = "0x1111111111111111111111111111111111111111" as Address;
    const to = "0x2222222222222222222222222222222222222222" as Address;
    const value = 1000000000000000000n;

    const log = createTransferLog(from, to, value);
    const decoded = decodeEventLog(ERC20_ABI as unknown as Abi, log);

    expect(decoded).not.toBeNull();
    expect(decoded!.eventName).toBe("Transfer");
    expect(decoded!.args.from).toBe(from);
    expect(decoded!.args.to).toBe(to);
    expect(decoded!.args.value).toBe(value);
    expect(decoded!.argsList).toHaveLength(3);
  });

  it("should return null for unknown event topic", () => {
    const log = {
      address: "0x1234567890123456789012345678901234567890" as Address,
      topics: [("0x" + "a".repeat(64)) as Hex],
      data: "0x" as Hex,
    };

    const decoded = decodeEventLog(ERC20_ABI as unknown as Abi, log);
    expect(decoded).toBeNull();
  });

  it("should return null for anonymous events", () => {
    const log = {
      address: "0x1234567890123456789012345678901234567890" as Address,
      topics: [],
      data: "0x" as Hex,
    };

    const decoded = decodeEventLog(ERC20_ABI as unknown as Abi, log);
    expect(decoded).toBeNull();
  });

  it("should include optional log metadata when present", () => {
    const from = "0x1111111111111111111111111111111111111111" as Address;
    const to = "0x2222222222222222222222222222222222222222" as Address;
    const log = {
      ...createTransferLog(from, to, 100n),
      blockNumber: 12345n,
      transactionHash: ("0x" + "b".repeat(64)) as Hex,
      logIndex: 3,
    };

    const decoded = decodeEventLog(ERC20_ABI as unknown as Abi, log);

    expect(decoded).not.toBeNull();
    expect(decoded!.blockNumber).toBe(12345n);
    expect(decoded!.transactionHash).toBe(log.transactionHash);
    expect(decoded!.logIndex).toBe(3);
  });

  it("should include event topic in decoded result", () => {
    const from = "0x1111111111111111111111111111111111111111" as Address;
    const to = "0x2222222222222222222222222222222222222222" as Address;
    const log = createTransferLog(from, to, 100n);

    const decoded = decodeEventLog(ERC20_ABI as unknown as Abi, log);

    expect(decoded).not.toBeNull();
    expect(decoded!.topic).toBe(TRANSFER_TOPIC);
  });
});

describe("decodeEventLogStrict", () => {
  it("should decode valid event", () => {
    const from = "0x1111111111111111111111111111111111111111" as Address;
    const to = "0x2222222222222222222222222222222222222222" as Address;
    const log = createTransferLog(from, to, 100n);

    const decoded = decodeEventLogStrict(ERC20_ABI as unknown as Abi, log);

    expect(decoded.eventName).toBe("Transfer");
  });

  it("should throw EventNotFoundError for unknown topic", () => {
    const log = {
      address: "0x1234567890123456789012345678901234567890" as Address,
      topics: [("0x" + "a".repeat(64)) as Hex],
      data: "0x" as Hex,
    };

    expect(() => decodeEventLogStrict(ERC20_ABI as unknown as Abi, log)).toThrow(
      EventNotFoundError
    );
  });

  it("should throw AnonymousEventError for anonymous events", () => {
    const log = {
      address: "0x1234567890123456789012345678901234567890" as Address,
      topics: [],
      data: "0x" as Hex,
    };

    expect(() => decodeEventLogStrict(ERC20_ABI as unknown as Abi, log)).toThrow(
      AnonymousEventError
    );
  });
});

describe("getEventTopic", () => {
  it("should return correct topic for Transfer event", () => {
    const topic = getEventTopic(ERC20_ABI as unknown as Abi, "Transfer");
    expect(topic).toBe(TRANSFER_TOPIC);
  });

  it("should return correct topic for Approval event", () => {
    const expectedTopic = keccak256(toUtf8Bytes("Approval(address,address,uint256)"));
    const topic = getEventTopic(ERC20_ABI as unknown as Abi, "Approval");
    expect(topic).toBe(expectedTopic);
  });

  it("should throw EventNotFoundError for unknown event", () => {
    expect(() => getEventTopic(ERC20_ABI as unknown as Abi, "NonExistent")).toThrow(
      EventNotFoundError
    );
  });
});

describe("getEventTopics", () => {
  it("should return map of all event topics", () => {
    const topics = getEventTopics(ERC20_ABI as unknown as Abi);

    expect(topics.size).toBe(2);
    expect(topics.get(TRANSFER_TOPIC)).toBe("Transfer");
  });
});

describe("buildEventFilter", () => {
  it("should build filter with just event topic", () => {
    const filter = buildEventFilter(ERC20_ABI as unknown as Abi, "Transfer");

    expect(filter.topics).toHaveLength(1);
    expect(filter.topics[0]).toBe(TRANSFER_TOPIC);
  });

  it("should build filter with indexed argument", () => {
    const from = "0x1111111111111111111111111111111111111111";
    const filter = buildEventFilter(ERC20_ABI as unknown as Abi, "Transfer", {
      from,
    });

    // Transfer has 2 indexed params (from, to), so topics = event topic + 2 indexed = 3
    expect(filter.topics).toHaveLength(3);
    expect(filter.topics[0]).toBe(TRANSFER_TOPIC);
    expect(filter.topics[1]).not.toBeNull();
  });

  it("should use null for wildcard indexed args", () => {
    const filter = buildEventFilter(ERC20_ABI as unknown as Abi, "Transfer", {
      from: null,
    });

    // Transfer has 2 indexed params (from, to), so 3 topics total (event topic + 2 indexed)
    expect(filter.topics).toHaveLength(3);
    expect(filter.topics[1]).toBeNull();
    expect(filter.topics[2]).toBeNull();
  });

  it("should throw EventNotFoundError for unknown event", () => {
    expect(() => buildEventFilter(ERC20_ABI as unknown as Abi, "NonExistent")).toThrow(
      EventNotFoundError
    );
  });
});
