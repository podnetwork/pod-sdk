import * as fs from "node:fs";
import * as path from "node:path";
import {
  detectArtifactFormat,
  safeParseArtifact,
  type Abi,
  type BuildArtifact,
  type ArtifactFormat,
} from "../schemas/index.js";
import { InvalidArtifactError } from "../errors/index.js";

/**
 * Result of extracting an ABI from an artifact
 */
export interface ExtractedAbi {
  /** Contract name derived from artifact */
  contractName: string;
  /** Extracted ABI array */
  abi: Abi;
  /** Source file path */
  sourceFile: string;
  /** Detected artifact format */
  format: ArtifactFormat;
}

/**
 * Extract ABI from a single artifact file
 *
 * @param filePath - Path to the artifact file (Foundry or Hardhat JSON)
 * @returns Extracted ABI with metadata
 * @throws InvalidArtifactError if the file is not a valid artifact
 */
export function extractAbiFromFile(filePath: string): ExtractedAbi {
  const absolutePath = path.resolve(filePath);

  // Read file
  let fileContents: string;
  try {
    fileContents = fs.readFileSync(absolutePath, "utf-8");
  } catch (error) {
    throw new InvalidArtifactError(`Cannot read file: ${absolutePath}`, absolutePath, {
      cause: error instanceof Error ? error : undefined,
    });
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    throw new InvalidArtifactError(`Invalid JSON in file: ${absolutePath}`, absolutePath, {
      cause: error instanceof Error ? error : undefined,
    });
  }

  // Detect format
  const format = detectArtifactFormat(parsed);
  if (format === null) {
    throw new InvalidArtifactError(
      `Unknown artifact format in file: ${absolutePath}`,
      absolutePath,
      {
        suggestion: `The file does not contain a valid ABI. Expected structure:
  - Foundry: { "abi": [...] } or { "abi": [...], "bytecode": { "object": "0x..." } }
  - Hardhat: { "_format": "hh3-artifact-1", "abi": [...] }`,
      }
    );
  }

  // Validate with zod schema
  const artifact = safeParseArtifact(parsed);
  if (artifact === null) {
    throw new InvalidArtifactError(
      `Invalid artifact structure in file: ${absolutePath}`,
      absolutePath
    );
  }

  // Extract contract name
  const contractName = deriveContractName(artifact, filePath, format);

  return {
    contractName,
    abi: artifact.abi,
    sourceFile: absolutePath,
    format,
  };
}

/**
 * Derive contract name from artifact or file path
 */
function deriveContractName(
  artifact: BuildArtifact,
  filePath: string,
  format: ArtifactFormat
): string {
  // Hardhat artifacts have explicit contractName
  if (format === "hardhat" && "_format" in artifact) {
    return artifact.contractName;
  }

  // For Foundry, derive from file path
  // Path is typically: out/ContractName.sol/ContractName.json
  const baseName = path.basename(filePath, ".json");
  return baseName;
}

/**
 * Check if a file is likely a valid artifact (not debug file or build-info)
 *
 * @param filePath - Path to check
 * @returns true if the file should be processed
 */
export function isValidArtifactFile(filePath: string): boolean {
  const fileName = path.basename(filePath);

  // Skip debug files
  if (fileName.endsWith(".dbg.json")) {
    return false;
  }

  // Skip build-info files (Hardhat)
  if (filePath.includes("build-info")) {
    return false;
  }

  // Skip metadata files (Foundry)
  if (fileName === "metadata.json") {
    return false;
  }

  return true;
}

/**
 * Check if a file exists and is readable
 */
export function fileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
