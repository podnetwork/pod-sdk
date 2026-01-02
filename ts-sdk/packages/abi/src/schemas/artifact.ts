import { z } from "zod";
import { AbiSchema } from "./abi.js";

/**
 * Schema for Foundry build artifact
 *
 * Foundry outputs artifacts to `out/<Contract>.sol/<Contract>.json`
 * with bytecode as nested object: `{ bytecode: { object: "0x..." } }`
 */
export const FoundryArtifactSchema = z.object({
  abi: AbiSchema,
  bytecode: z
    .object({
      object: z.string(),
    })
    .optional(),
  deployedBytecode: z
    .object({
      object: z.string(),
    })
    .optional(),
  metadata: z.unknown().optional(),
  ast: z.unknown().optional(),
  id: z.number().optional(),
});

export type FoundryArtifact = z.infer<typeof FoundryArtifactSchema>;

/**
 * Schema for Hardhat 3 build artifact
 *
 * Hardhat outputs artifacts to `artifacts/contracts/<Contract>.sol/<Contract>.json`
 * with `_format: "hh3-artifact-1"` identifier
 */
export const HardhatArtifactSchema = z.object({
  _format: z.literal("hh3-artifact-1"),
  contractName: z.string(),
  sourceName: z.string(),
  abi: AbiSchema,
  bytecode: z.string(),
  deployedBytecode: z.string(),
  linkReferences: z.record(z.record(z.array(z.unknown()))).optional(),
  deployedLinkReferences: z.record(z.record(z.array(z.unknown()))).optional(),
});

export type HardhatArtifact = z.infer<typeof HardhatArtifactSchema>;

/**
 * Artifact format enum for detection results
 */
export type ArtifactFormat = "foundry" | "hardhat";

/**
 * Combined artifact schema that accepts either Foundry or Hardhat format
 *
 * Detection logic:
 * - If `_format` field exists → Hardhat format
 * - If `bytecode.object` exists → Foundry format
 * - Otherwise → Unknown format (validation error)
 */
export const BuildArtifactSchema = z.union([HardhatArtifactSchema, FoundryArtifactSchema]);

export type BuildArtifact = z.infer<typeof BuildArtifactSchema>;

/**
 * Detect artifact format from raw JSON object
 *
 * @param artifact - Parsed JSON artifact
 * @returns Detected format or null if unknown
 */
export function detectArtifactFormat(artifact: unknown): ArtifactFormat | null {
  if (typeof artifact !== "object" || artifact === null) {
    return null;
  }

  const obj = artifact as Record<string, unknown>;

  // Hardhat 3 artifacts have `_format: "hh3-artifact-1"`
  if (obj["_format"] === "hh3-artifact-1") {
    return "hardhat";
  }

  // Foundry artifacts have nested bytecode object
  if (
    typeof obj["bytecode"] === "object" &&
    obj["bytecode"] !== null &&
    "object" in obj["bytecode"]
  ) {
    return "foundry";
  }

  // Also accept Foundry format without bytecode (ABI-only mode)
  if (Array.isArray(obj["abi"]) && !("_format" in obj)) {
    return "foundry";
  }

  return null;
}

/**
 * Parse and validate an artifact file
 *
 * @param artifact - Parsed JSON artifact
 * @returns Validated artifact with ABI
 * @throws ZodError if validation fails
 */
export function parseArtifact(artifact: unknown): BuildArtifact {
  return BuildArtifactSchema.parse(artifact);
}

/**
 * Safely parse an artifact, returning null on failure
 *
 * @param artifact - Parsed JSON artifact
 * @returns Validated artifact or null
 */
export function safeParseArtifact(artifact: unknown): BuildArtifact | null {
  const result = BuildArtifactSchema.safeParse(artifact);
  return result.success ? result.data : null;
}

/**
 * Extract ABI from an artifact
 *
 * @param artifact - Validated artifact
 * @returns ABI array from the artifact
 */
export function extractAbiFromArtifact(artifact: BuildArtifact): z.infer<typeof AbiSchema> {
  return artifact.abi;
}
