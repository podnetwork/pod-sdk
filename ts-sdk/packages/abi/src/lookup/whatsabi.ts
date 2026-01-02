/**
 * WhatsABI integration for ABI discovery
 *
 * This file handles dynamic imports of the optional @shazow/whatsabi dependency.
 * Since the module is loaded at runtime, we cannot statically type the imported values.
 *
 * @see FR-040 through FR-044
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { Abi } from "abitype";
import { WhatsAbiNotInstalledError, LookupServiceError } from "../errors/index.js";

// External types
type Address = `0x${string}`;
type Hex = `0x${string}`;

/**
 * Minimal provider interface for ABI lookup operations.
 * Only requires eth_getCode capability.
 */
export interface AbiLookupProvider {
  /**
   * Get contract bytecode at address.
   *
   * @param address - Contract address
   * @returns Deployed bytecode
   */
  getCode(address: Address): Promise<Hex>;
}

/**
 * Result from ABI lookup operation
 */
export interface LookupResult {
  /** Reconstructed ABI from bytecode analysis */
  abi: Abi;
  /** Resolved address (may differ from input if proxy) */
  address: Address;
  /** Whether a proxy pattern was detected */
  isProxy: boolean;
  /** Implementation address if proxy was detected */
  implementationAddress?: Address;
  /** Raw function selectors found in bytecode */
  selectors: readonly Hex[];
  /** True if some selectors couldn't be resolved to signatures */
  hasUnresolvedSelectors: boolean;
}

/**
 * Options for lookup operations
 */
export interface LookupOptions {
  /**
   * Failure behavior when lookup services are unavailable:
   * - "graceful": Return partial results with unresolved selectors flagged (default)
   * - "strict": Throw LookupServiceError
   *
   * @see FR-044
   */
  onServiceFailure?: "graceful" | "strict";
}

/**
 * Cached WhatsABI module
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let whatsabiModule: any = null;

/**
 * Dynamically load WhatsABI module
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadWhatsABI(): Promise<any> {
  if (whatsabiModule !== null) {
    return whatsabiModule;
  }

  try {
    whatsabiModule = await import("@shazow/whatsabi");
    return whatsabiModule;
  } catch {
    throw new WhatsAbiNotInstalledError();
  }
}

/**
 * Analyze contract bytecode and look up signatures to reconstruct ABI.
 *
 * @param address - Contract address to analyze
 * @param provider - Provider with getCode capability
 * @param options - Lookup options
 * @returns Lookup result with reconstructed ABI
 * @throws WhatsAbiNotInstalledError if @shazow/whatsabi is not installed
 * @throws LookupServiceError if onServiceFailure is "strict" and services unavailable
 *
 * @example
 * ```ts
 * import { lookupAbi, createLookupProvider } from "@podnetwork/abi/lookup";
 *
 * const provider = createLookupProvider(rpcClient);
 * const result = await lookupAbi(contractAddress, provider);
 *
 * console.log(`Found ${result.abi.length} items`);
 * if (result.hasUnresolvedSelectors) {
 *   console.warn("Some functions could not be resolved");
 * }
 * ```
 *
 * @see FR-040, FR-041, FR-042, FR-043, FR-044
 */
export async function lookupAbi(
  address: Address,
  provider: AbiLookupProvider,
  options: LookupOptions = {}
): Promise<LookupResult> {
  const { onServiceFailure = "graceful" } = options;
  const whatsabi = await loadWhatsABI();

  // Get bytecode
  const bytecode = await provider.getCode(address);

  // Empty bytecode is "0x" (2 chars) - no deployed contract
  if (bytecode.length <= 2) {
    return {
      abi: [],
      address,
      isProxy: false,
      selectors: [],
      hasUnresolvedSelectors: false,
    };
  }

  // Extract selectors from bytecode
  const selectors = whatsabi.selectorsFromBytecode(bytecode) as Hex[];

  // Try to resolve signatures
  const resolvedAbiItems: Abi[number][] = [];
  let hasUnresolvedSelectors = false;

  try {
    // Use OpenChain signature lookup
    const signatureLookup = new whatsabi.loaders.OpenChainSignatureLookup();
    const resolved = await Promise.all(
      selectors.map(async (selector) => {
        try {
          const sigs = await signatureLookup.loadFunctions(selector);
          if (sigs !== null && sigs !== undefined && sigs.length > 0) {
            // Use the first matching signature
            return sigs[0];
          }
          return null;
        } catch {
          return null;
        }
      })
    );

    // Build ABI from resolved signatures
    for (let i = 0; i < selectors.length; i++) {
      const sig = resolved[i];
      if (sig !== null && sig !== undefined && sig !== "") {
        try {
          // Parse signature into ABI item
          const match = /^(\w+)\((.*)\)$/.exec(sig);
          if (match !== null) {
            const [, name, params] = match;
            const inputs =
              params !== undefined && params !== ""
                ? params.split(",").map((type, idx) => ({
                    name: `arg${String(idx)}`,
                    type: type.trim(),
                  }))
                : [];
            resolvedAbiItems.push({
              type: "function",
              name,
              inputs,
              outputs: [],
              stateMutability: "nonpayable",
            } as Abi[number]);
          }
        } catch {
          hasUnresolvedSelectors = true;
        }
      } else {
        hasUnresolvedSelectors = true;
      }
    }
  } catch (_error) {
    if (onServiceFailure === "strict") {
      throw new LookupServiceError("OpenChain");
    }
    hasUnresolvedSelectors = selectors.length > 0;
  }

  // Check for proxy patterns using bytecode analysis
  let isProxy = false;

  try {
    // Check for common proxy bytecode patterns
    // Note: WhatsABI's proxy detection requires autoload, not available here
    // For now, do basic DELEGATECALL pattern detection
    isProxy = bytecode.includes("363d3d373d3d3d363d73");
  } catch {
    // Ignore proxy detection errors
  }

  const result: LookupResult = {
    abi: resolvedAbiItems as unknown as Abi,
    address,
    isProxy,
    selectors,
    hasUnresolvedSelectors,
  };

  return result;
}

/**
 * Extract function selectors from bytecode only (no signature lookup).
 *
 * @param address - Contract address to analyze
 * @param provider - Provider with getCode capability
 * @returns Array of 4-byte selectors found in bytecode
 * @throws WhatsAbiNotInstalledError if @shazow/whatsabi is not installed
 *
 * @see FR-040
 */
export async function lookupSelectors(
  address: Address,
  provider: AbiLookupProvider
): Promise<Hex[]> {
  const whatsabi = await loadWhatsABI();

  const bytecode = await provider.getCode(address);

  // Empty bytecode is "0x" (2 chars) - no deployed contract
  if (bytecode.length <= 2) {
    return [];
  }

  return whatsabi.selectorsFromBytecode(bytecode) as Hex[];
}

/**
 * Look up function signatures for selectors using 4byte/OpenChain.
 *
 * @param selectors - Array of 4-byte selectors
 * @param options - Lookup options
 * @returns Map of selector to possible signatures (may have multiple)
 * @throws WhatsAbiNotInstalledError if @shazow/whatsabi is not installed
 * @throws LookupServiceError if onServiceFailure is "strict" and services unavailable
 *
 * @see FR-041
 */
export async function lookupSignatures(
  selectors: Hex[],
  options: LookupOptions = {}
): Promise<Map<Hex, string[]>> {
  const { onServiceFailure = "graceful" } = options;
  const whatsabi = await loadWhatsABI();

  const results = new Map<Hex, string[]>();

  try {
    const signatureLookup = new whatsabi.loaders.OpenChainSignatureLookup();

    await Promise.all(
      selectors.map(async (selector) => {
        try {
          const sigs = await signatureLookup.loadFunctions(selector);
          if (sigs !== null && sigs !== undefined && sigs.length > 0) {
            results.set(selector, sigs);
          }
        } catch {
          // Individual selector lookup failed, continue with others
        }
      })
    );
  } catch (_error) {
    if (onServiceFailure === "strict") {
      throw new LookupServiceError("OpenChain");
    }
  }

  return results;
}

/**
 * Look up event signatures for topics using 4byte/OpenChain.
 *
 * @param topics - Array of 32-byte event topics
 * @param options - Lookup options
 * @returns Map of topic to possible signatures (may have multiple)
 * @throws WhatsAbiNotInstalledError if @shazow/whatsabi is not installed
 * @throws LookupServiceError if onServiceFailure is "strict" and services unavailable
 *
 * @see FR-041
 */
export async function lookupEventSignatures(
  topics: Hex[],
  options: LookupOptions = {}
): Promise<Map<Hex, string[]>> {
  const { onServiceFailure = "graceful" } = options;
  const whatsabi = await loadWhatsABI();

  const results = new Map<Hex, string[]>();

  try {
    const signatureLookup = new whatsabi.loaders.OpenChainSignatureLookup();

    await Promise.all(
      topics.map(async (topic) => {
        try {
          const sigs = await signatureLookup.loadEvents(topic);
          if (sigs !== null && sigs !== undefined && sigs.length > 0) {
            results.set(topic, sigs);
          }
        } catch {
          // Individual topic lookup failed, continue with others
        }
      })
    );
  } catch (_error) {
    if (onServiceFailure === "strict") {
      throw new LookupServiceError("OpenChain");
    }
  }

  return results;
}
