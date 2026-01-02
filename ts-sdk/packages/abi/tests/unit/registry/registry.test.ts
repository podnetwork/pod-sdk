/**
 * Tests for ABI registry utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";
import type { Abi } from "abitype";
import { createRegistry, type AbiRegistry } from "../../../src/registry/registry.js";
import { DuplicateRegistrationError } from "../../../src/errors/index.js";
import { ERC20_ABI } from "../../../src/abis/common/erc20.js";

type Address = `0x${string}`;
type Hex = `0x${string}`;

const TOKEN_ADDRESS = "0x1234567890123456789012345678901234567890" as Address;
const OTHER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Address;

const TRANSFER_TOPIC = keccak256(toUtf8Bytes("Transfer(address,address,uint256)")) as Hex;

function createTransferLog(
  from: Address,
  to: Address,
  value: bigint,
  address: Address = TOKEN_ADDRESS
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

describe("createRegistry", () => {
  let registry: AbiRegistry;

  beforeEach(() => {
    registry = createRegistry();
  });

  describe("register", () => {
    it("should register an ABI for an address", () => {
      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);

      expect(registry.has(TOKEN_ADDRESS)).toBe(true);
      expect(registry.size).toBe(1);
    });

    it("should normalize addresses to lowercase", () => {
      const upperAddress = TOKEN_ADDRESS.toUpperCase() as Address;
      registry.register(upperAddress, ERC20_ABI as unknown as Abi);

      expect(registry.has(TOKEN_ADDRESS)).toBe(true);
      expect(registry.has(upperAddress)).toBe(true);
    });

    it("should replace existing registration by default", () => {
      const customAbi: Abi = [
        {
          type: "function",
          name: "custom",
          inputs: [],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ];

      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);
      registry.register(TOKEN_ADDRESS, customAbi);

      const abi = registry.get(TOKEN_ADDRESS);
      expect(abi).toHaveLength(1);
      expect(abi![0]!.name).toBe("custom");
    });
  });

  describe("unregister", () => {
    it("should remove registered ABI", () => {
      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);

      const result = registry.unregister(TOKEN_ADDRESS);

      expect(result).toBe(true);
      expect(registry.has(TOKEN_ADDRESS)).toBe(false);
      expect(registry.size).toBe(0);
    });

    it("should return false for non-registered address", () => {
      const result = registry.unregister(TOKEN_ADDRESS);

      expect(result).toBe(false);
    });
  });

  describe("get", () => {
    it("should return registered ABI", () => {
      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);

      const abi = registry.get(TOKEN_ADDRESS);

      expect(abi).toEqual(ERC20_ABI);
    });

    it("should return undefined for non-registered address", () => {
      const abi = registry.get(TOKEN_ADDRESS);

      expect(abi).toBeUndefined();
    });
  });

  describe("has", () => {
    it("should return true for registered address", () => {
      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);

      expect(registry.has(TOKEN_ADDRESS)).toBe(true);
    });

    it("should return false for non-registered address", () => {
      expect(registry.has(TOKEN_ADDRESS)).toBe(false);
    });
  });

  describe("decodeLog", () => {
    it("should decode log for registered address", () => {
      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);

      const log = createTransferLog(
        "0x1111111111111111111111111111111111111111" as Address,
        "0x2222222222222222222222222222222222222222" as Address,
        1000n
      );

      const decoded = registry.decodeLog(log);

      expect(decoded).not.toBeNull();
      expect(decoded!.eventName).toBe("Transfer");
    });

    it("should return null for non-registered address", () => {
      const log = createTransferLog(
        "0x1111111111111111111111111111111111111111" as Address,
        "0x2222222222222222222222222222222222222222" as Address,
        1000n
      );

      const decoded = registry.decodeLog(log);

      expect(decoded).toBeNull();
    });

    it("should return null for unknown event", () => {
      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);

      const log = {
        address: TOKEN_ADDRESS,
        topics: [("0x" + "ab".repeat(32)) as Hex],
        data: "0x" as Hex,
      };

      const decoded = registry.decodeLog(log);

      expect(decoded).toBeNull();
    });
  });

  describe("decodeError", () => {
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

    it("should decode error for registered address", () => {
      registry.register(TOKEN_ADDRESS, ERROR_ABI);

      const selector = keccak256(toUtf8Bytes("InsufficientBalance(uint256,uint256)")).slice(0, 10);
      const abiCoder = AbiCoder.defaultAbiCoder();
      const encodedArgs = abiCoder.encode(["uint256", "uint256"], [100n, 200n]);
      const data = (selector + encodedArgs.slice(2)) as Hex;

      const decoded = registry.decodeError(TOKEN_ADDRESS, data);

      expect(decoded).not.toBeNull();
      expect(decoded!.errorName).toBe("InsufficientBalance");
    });

    it("should return null for non-registered address", () => {
      const data = ("0x" + "aa".repeat(36)) as Hex;

      const decoded = registry.decodeError(TOKEN_ADDRESS, data);

      expect(decoded).toBeNull();
    });
  });

  describe("clear", () => {
    it("should remove all registrations", () => {
      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);
      registry.register(OTHER_ADDRESS, ERC20_ABI as unknown as Abi);

      expect(registry.size).toBe(2);

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.has(TOKEN_ADDRESS)).toBe(false);
      expect(registry.has(OTHER_ADDRESS)).toBe(false);
    });
  });

  describe("addresses", () => {
    it("should return list of registered addresses", () => {
      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);
      registry.register(OTHER_ADDRESS, ERC20_ABI as unknown as Abi);

      const addresses = registry.addresses;

      expect(addresses).toHaveLength(2);
      expect(addresses).toContain(TOKEN_ADDRESS.toLowerCase());
      expect(addresses).toContain(OTHER_ADDRESS.toLowerCase());
    });

    it("should return empty array when no registrations", () => {
      expect(registry.addresses).toHaveLength(0);
    });
  });
});

describe("createRegistry with options", () => {
  describe("onDuplicate: keep", () => {
    it("should keep existing registration", () => {
      const registry = createRegistry({ onDuplicate: "keep" });
      const customAbi: Abi = [
        {
          type: "function",
          name: "custom",
          inputs: [],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ];

      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);
      registry.register(TOKEN_ADDRESS, customAbi);

      const abi = registry.get(TOKEN_ADDRESS);
      expect(abi).toEqual(ERC20_ABI);
    });
  });

  describe("onDuplicate: error", () => {
    it("should throw DuplicateRegistrationError", () => {
      const registry = createRegistry({ onDuplicate: "error" });

      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);

      expect(() => {
        registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);
      }).toThrow(DuplicateRegistrationError);
    });
  });

  describe("onDuplicate: replace (default)", () => {
    it("should replace existing registration", () => {
      const registry = createRegistry({ onDuplicate: "replace" });
      const customAbi: Abi = [
        {
          type: "function",
          name: "custom",
          inputs: [],
          outputs: [],
          stateMutability: "nonpayable",
        },
      ];

      registry.register(TOKEN_ADDRESS, ERC20_ABI as unknown as Abi);
      registry.register(TOKEN_ADDRESS, customAbi);

      const abi = registry.get(TOKEN_ADDRESS);
      expect(abi).toEqual(customAbi);
    });
  });
});
