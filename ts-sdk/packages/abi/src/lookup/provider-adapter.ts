/**
 * Provider adapter for ABI lookup
 *
 * Adapts various RPC client interfaces to the minimal AbiLookupProvider interface.
 */

import type { AbiLookupProvider } from "./whatsabi.js";

// External types
type Address = `0x${string}`;
type Hex = `0x${string}`;

/**
 * RPC client interface (from @podnetwork/core)
 */
export interface RpcClient {
  request<T>(method: string, params: unknown[]): Promise<T>;
}

/**
 * Adapt Pod Network RPC client to WhatsABI provider interface.
 *
 * @param rpc - Pod Network RPC client
 * @returns Provider suitable for lookup functions
 *
 * @example
 * ```ts
 * import { createRpcClient } from "@podnetwork/core";
 * import { createLookupProvider, lookupAbi } from "@podnetwork/abi/lookup";
 *
 * const rpc = createRpcClient({ url: "https://rpc.pod.network" });
 * const provider = createLookupProvider(rpc);
 * const result = await lookupAbi(address, provider);
 * ```
 */
export function createLookupProvider(rpc: RpcClient): AbiLookupProvider {
  return {
    async getCode(address: Address): Promise<Hex> {
      const code = await rpc.request<string>("eth_getCode", [address, "latest"]);
      return code as Hex;
    },
  };
}

/**
 * Create a lookup provider from an ethers.js provider
 *
 * @param provider - ethers.js Provider instance
 * @returns Provider suitable for lookup functions
 *
 * @example
 * ```ts
 * import { JsonRpcProvider } from "ethers";
 * import { createEthersLookupProvider, lookupAbi } from "@podnetwork/abi/lookup";
 *
 * const ethersProvider = new JsonRpcProvider("https://rpc.pod.network");
 * const provider = createEthersLookupProvider(ethersProvider);
 * const result = await lookupAbi(address, provider);
 * ```
 */
export function createEthersLookupProvider(provider: {
  getCode(address: string): Promise<string>;
}): AbiLookupProvider {
  return {
    async getCode(address: Address): Promise<Hex> {
      const code = await provider.getCode(address);
      return code as Hex;
    },
  };
}
