/**
 * Lookup module for @podnetwork/abi
 *
 * Provides ABI discovery using WhatsABI bytecode analysis.
 *
 * NOTE: This module requires @shazow/whatsabi as an optional dependency.
 * Import from '@podnetwork/abi/lookup' only if you need ABI discovery.
 */

export {
  lookupAbi,
  lookupSelectors,
  lookupSignatures,
  lookupEventSignatures,
  type AbiLookupProvider,
  type LookupResult,
  type LookupOptions,
} from "./whatsabi.js";

export {
  createLookupProvider,
  createEthersLookupProvider,
  type RpcClient,
} from "./provider-adapter.js";
