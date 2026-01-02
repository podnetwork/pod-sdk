import { describe, it, expect, vi, beforeEach } from "vitest";
import { TypedContract, type TransactionSender, type ContractSigner } from "../../src/contract.js";
import type { Abi } from "abitype";

// Mock ERC20 ABI
const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "error InsufficientBalance(uint256 available, uint256 required)",
] as const;

const mockAddress = "0x1234567890123456789012345678901234567890" as const;

describe("TypedContract", () => {
  let mockSender: TransactionSender;
  let mockSigner: ContractSigner;

  beforeEach(() => {
    mockSender = {
      sendRawTransaction: vi.fn().mockResolvedValue("0x" + "ab".repeat(32)),
      getTransactionCount: vi.fn().mockResolvedValue(0n),
      estimateGas: vi.fn().mockResolvedValue(21000n),
      getGasPrice: vi.fn().mockResolvedValue(1000000000n),
      getChainId: vi.fn().mockResolvedValue(1n),
      call: vi
        .fn()
        .mockResolvedValue("0x0000000000000000000000000000000000000000000000000000000000000064"),
      gasEstimationBuffer: 120,
    };

    mockSigner = {
      getAddress: vi.fn().mockResolvedValue(mockAddress),
      signTransaction: vi.fn().mockResolvedValue("0xsignedtx"),
    };
  });

  describe("construction", () => {
    it("should create contract from ABI array", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      expect(contract.address).toBe(mockAddress);
      expect(contract.abi).toBe(erc20Abi);
    });

    it("should create read and write proxy objects", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      expect(contract.read).toBeDefined();
      expect(contract.write).toBeDefined();
    });

    it("should have an ethers Interface", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      expect(contract.interface).toBeDefined();
    });
  });

  describe("read methods", () => {
    it("should encode and call read function", async () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);

      // Mock call to return encoded uint256 (100)
      (mockSender.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        "0x0000000000000000000000000000000000000000000000000000000000000064"
      );

      const balance = await contract.read.balanceOf(mockAddress);

      expect(mockSender.call).toHaveBeenCalledWith({
        to: mockAddress,
        data: expect.stringMatching(/^0x70a08231/), // balanceOf selector
      });
      expect(balance).toBe(100n);
    });

    it("should decode string return values", async () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);

      // Encode "TestToken" as ABI-encoded string
      const encodedString =
        "0x" +
        "0000000000000000000000000000000000000000000000000000000000000020" + // offset
        "0000000000000000000000000000000000000000000000000000000000000009" + // length (9)
        "54657374546f6b656e0000000000000000000000000000000000000000000000"; // "TestToken"

      (mockSender.call as ReturnType<typeof vi.fn>).mockResolvedValueOnce(encodedString);

      const name = await contract.read.name();
      expect(name).toBe("TestToken");
    });
  });

  describe("write methods", () => {
    it("should encode, sign, and send write function", async () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const recipient = "0x0000000000000000000000000000000000000001";

      const pending = await contract.write.transfer(mockSigner, recipient, 100n);

      expect(mockSigner.getAddress).toHaveBeenCalled();
      expect(mockSender.getTransactionCount).toHaveBeenCalledWith(mockAddress);
      expect(mockSender.estimateGas).toHaveBeenCalled();
      expect(mockSigner.signTransaction).toHaveBeenCalled();
      expect(mockSender.sendRawTransaction).toHaveBeenCalledWith("0xsignedtx");
      expect(pending.txHash).toBeDefined();
    });
  });

  describe("event methods", () => {
    it("should get event topic", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const topic = contract.getEventTopic("Transfer");
      expect(topic).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it("should get event names", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const events = contract.getEventNames();
      expect(events).toContain("Transfer");
      expect(events).toContain("Approval");
    });

    it("should create event filter", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const filter = contract.createEventFilter("Transfer");
      expect(filter.address).toBe(mockAddress);
      expect(filter.topics).toHaveLength(1);
      expect(filter.topics[0]).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it("should decode event log", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);

      // Transfer event log
      const log = {
        address: mockAddress,
        topics: [
          contract.getEventTopic("Transfer"),
          "0x0000000000000000000000001234567890123456789012345678901234567890", // from
          "0x0000000000000000000000000000000000000000000000000000000000000001", // to
        ] as const,
        data: "0x0000000000000000000000000000000000000000000000000000000000000064", // 100
        blockNumber: 12345n,
        transactionHash: ("0x" + "ab".repeat(32)) as `0x${string}`,
        logIndex: 0,
      };

      const decoded = contract.decodeEventLog(log);
      expect(decoded).not.toBeNull();
      expect(decoded?.name).toBe("Transfer");
      expect(decoded?.args).toHaveLength(3);
      expect(decoded?.blockNumber).toBe(12345n);
    });
  });

  describe("error methods", () => {
    it("should get error names", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const errors = contract.getErrorNames();
      expect(errors).toContain("InsufficientBalance");
    });

    it("should get error selector", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const selector = contract.getErrorSelector("InsufficientBalance");
      expect(selector).toMatch(/^0x[a-f0-9]{8}$/);
    });

    it("should get error selectors map", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const selectors = contract.getErrorSelectors();
      expect(selectors.size).toBeGreaterThan(0);
      for (const [selector, name] of selectors) {
        expect(selector).toMatch(/^0x[a-f0-9]{8}$/);
        expect(name).toBe("InsufficientBalance");
      }
    });

    it("should check if data matches error", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const selector = contract.getErrorSelector("InsufficientBalance");

      // Data that starts with the error selector
      const revertData =
        selector +
        "0000000000000000000000000000000000000000000000000000000000000064" +
        "00000000000000000000000000000000000000000000000000000000000000c8";

      expect(contract.isError(revertData, "InsufficientBalance")).toBe(true);
      expect(contract.isError("0x12345678", "InsufficientBalance")).toBe(false);
    });

    it("should parse error from revert data", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const selector = contract.getErrorSelector("InsufficientBalance");

      // Encode InsufficientBalance(100, 200)
      const revertData =
        selector +
        "0000000000000000000000000000000000000000000000000000000000000064" + // 100
        "00000000000000000000000000000000000000000000000000000000000000c8"; // 200

      const parsed = contract.parseError(revertData);
      expect(parsed).not.toBeNull();
      expect(parsed?.errorName).toBe("InsufficientBalance");
      expect(parsed?.errorArgs).toHaveLength(2);
      expect(parsed?.errorArgs[0]).toBe(100n);
      expect(parsed?.errorArgs[1]).toBe(200n);
    });
  });

  describe("function methods", () => {
    it("should get function names", () => {
      const contract = new TypedContract(mockAddress, erc20Abi as unknown as Abi, mockSender);
      const functions = contract.getFunctionNames();
      expect(functions).toContain("balanceOf");
      expect(functions).toContain("transfer");
      expect(functions).toContain("approve");
      expect(functions).toContain("name");
    });
  });
});
