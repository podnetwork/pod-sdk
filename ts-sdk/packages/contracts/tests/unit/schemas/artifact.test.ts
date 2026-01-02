import { describe, it, expect } from "vitest";
import {
  FoundryArtifactSchema,
  HardhatArtifactSchema,
  BuildArtifactSchema,
  detectArtifactFormat,
  parseArtifact,
  safeParseArtifact,
} from "../../../src/schemas/index.js";

const sampleAbi = [
  {
    type: "function" as const,
    name: "balanceOf",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view" as const,
  },
];

describe("Artifact Schemas", () => {
  describe("FoundryArtifactSchema", () => {
    it("should validate complete Foundry artifact", () => {
      const artifact = {
        abi: sampleAbi,
        bytecode: { object: "0x608060405234801561001057600080fd5b50" },
        deployedBytecode: { object: "0x608060405234801561001057600080fd5b50" },
      };
      const result = FoundryArtifactSchema.parse(artifact);
      expect(result.abi).toHaveLength(1);
      expect(result.bytecode?.object).toContain("0x6080");
    });

    it("should validate Foundry artifact without bytecode (ABI-only)", () => {
      const artifact = {
        abi: sampleAbi,
      };
      const result = FoundryArtifactSchema.parse(artifact);
      expect(result.abi).toHaveLength(1);
      expect(result.bytecode).toBeUndefined();
    });

    it("should validate Foundry artifact with metadata", () => {
      const artifact = {
        abi: sampleAbi,
        bytecode: { object: "0x6080" },
        metadata: { compiler: { version: "0.8.20" } },
        ast: { nodeType: "SourceUnit" },
        id: 42,
      };
      const result = FoundryArtifactSchema.parse(artifact);
      expect(result.id).toBe(42);
    });

    it("should reject artifact without ABI", () => {
      const artifact = {
        bytecode: { object: "0x6080" },
      };
      expect(() => FoundryArtifactSchema.parse(artifact)).toThrow();
    });
  });

  describe("HardhatArtifactSchema", () => {
    it("should validate complete Hardhat artifact", () => {
      const artifact = {
        _format: "hh3-artifact-1" as const,
        contractName: "Token",
        sourceName: "contracts/Token.sol",
        abi: sampleAbi,
        bytecode: "0x608060405234801561001057600080fd5b50",
        deployedBytecode: "0x608060405234801561001057600080fd5b50",
      };
      const result = HardhatArtifactSchema.parse(artifact);
      expect(result.contractName).toBe("Token");
      expect(result.sourceName).toBe("contracts/Token.sol");
    });

    it("should validate Hardhat artifact with link references", () => {
      const artifact = {
        _format: "hh3-artifact-1" as const,
        contractName: "Token",
        sourceName: "contracts/Token.sol",
        abi: sampleAbi,
        bytecode: "0x6080",
        deployedBytecode: "0x6080",
        linkReferences: {
          "contracts/Math.sol": {
            Math: [{ length: 20, start: 100 }],
          },
        },
        deployedLinkReferences: {},
      };
      const result = HardhatArtifactSchema.parse(artifact);
      expect(result.linkReferences).toBeDefined();
    });

    it("should reject wrong format identifier", () => {
      const artifact = {
        _format: "hh2-artifact-1",
        contractName: "Token",
        sourceName: "contracts/Token.sol",
        abi: sampleAbi,
        bytecode: "0x6080",
        deployedBytecode: "0x6080",
      };
      expect(() => HardhatArtifactSchema.parse(artifact)).toThrow();
    });

    it("should reject missing required fields", () => {
      const artifact = {
        _format: "hh3-artifact-1" as const,
        abi: sampleAbi,
        bytecode: "0x6080",
        deployedBytecode: "0x6080",
      };
      expect(() => HardhatArtifactSchema.parse(artifact)).toThrow();
    });
  });

  describe("BuildArtifactSchema", () => {
    it("should accept Foundry artifact", () => {
      const artifact = {
        abi: sampleAbi,
        bytecode: { object: "0x6080" },
      };
      const result = BuildArtifactSchema.parse(artifact);
      expect(result.abi).toHaveLength(1);
    });

    it("should accept Hardhat artifact", () => {
      const artifact = {
        _format: "hh3-artifact-1" as const,
        contractName: "Token",
        sourceName: "contracts/Token.sol",
        abi: sampleAbi,
        bytecode: "0x6080",
        deployedBytecode: "0x6080",
      };
      const result = BuildArtifactSchema.parse(artifact);
      expect(result.abi).toHaveLength(1);
    });

    it("should reject invalid artifact", () => {
      const artifact = {
        invalid: "data",
      };
      expect(() => BuildArtifactSchema.parse(artifact)).toThrow();
    });
  });

  describe("detectArtifactFormat", () => {
    it("should detect Foundry format with nested bytecode", () => {
      const artifact = {
        abi: sampleAbi,
        bytecode: { object: "0x6080" },
      };
      expect(detectArtifactFormat(artifact)).toBe("foundry");
    });

    it("should detect Foundry format with ABI-only", () => {
      const artifact = {
        abi: sampleAbi,
      };
      expect(detectArtifactFormat(artifact)).toBe("foundry");
    });

    it("should detect Hardhat format", () => {
      const artifact = {
        _format: "hh3-artifact-1",
        contractName: "Token",
        abi: sampleAbi,
      };
      expect(detectArtifactFormat(artifact)).toBe("hardhat");
    });

    it("should return null for null input", () => {
      expect(detectArtifactFormat(null)).toBeNull();
    });

    it("should return null for non-object input", () => {
      expect(detectArtifactFormat("string")).toBeNull();
      expect(detectArtifactFormat(123)).toBeNull();
      expect(detectArtifactFormat(undefined)).toBeNull();
    });

    it("should return null for unknown format", () => {
      const artifact = {
        unknown: "format",
      };
      expect(detectArtifactFormat(artifact)).toBeNull();
    });

    it("should prefer Hardhat detection over Foundry", () => {
      // Edge case: artifact has both _format and nested bytecode
      const artifact = {
        _format: "hh3-artifact-1",
        abi: sampleAbi,
        bytecode: { object: "0x6080" },
      };
      expect(detectArtifactFormat(artifact)).toBe("hardhat");
    });
  });

  describe("parseArtifact", () => {
    it("should parse valid Foundry artifact", () => {
      const artifact = {
        abi: sampleAbi,
        bytecode: { object: "0x6080" },
      };
      const result = parseArtifact(artifact);
      expect(result.abi).toHaveLength(1);
    });

    it("should parse valid Hardhat artifact", () => {
      const artifact = {
        _format: "hh3-artifact-1" as const,
        contractName: "Token",
        sourceName: "contracts/Token.sol",
        abi: sampleAbi,
        bytecode: "0x6080",
        deployedBytecode: "0x6080",
      };
      const result = parseArtifact(artifact);
      expect(result.abi).toHaveLength(1);
    });

    it("should throw on invalid artifact", () => {
      expect(() => parseArtifact({ invalid: true })).toThrow();
    });
  });

  describe("safeParseArtifact", () => {
    it("should return artifact for valid input", () => {
      const artifact = {
        abi: sampleAbi,
        bytecode: { object: "0x6080" },
      };
      const result = safeParseArtifact(artifact);
      expect(result).not.toBeNull();
      expect(result?.abi).toHaveLength(1);
    });

    it("should return null for invalid input", () => {
      const result = safeParseArtifact({ invalid: true });
      expect(result).toBeNull();
    });

    it("should return null for malformed ABI", () => {
      const artifact = {
        abi: [{ invalid: "item" }],
      };
      const result = safeParseArtifact(artifact);
      expect(result).toBeNull();
    });
  });
});
