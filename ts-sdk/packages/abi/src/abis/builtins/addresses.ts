/**
 * pod network built-in contract addresses
 *
 * @see FR-046, FR-047
 */

type Address = `0x${string}`;

/**
 * CLOB (Central Limit Order Book) contract address
 */
export const CLOB_ADDRESS: Address = "0x000000000000000000000000000000000000C10B";

/**
 * Optimistic Auction contract address
 */
export const OPTIMISTIC_AUCTION_ADDRESS: Address = "0xf6D39FB8492dC21293043f5E39F566D4A4ce2206";

/**
 * Bridge contract address for cross-chain deposits
 */
export const BRIDGE_ADDRESS: Address = "0x0000000000000000000000000000000000B41D9E";

/**
 * Native token address (used for native ETH/POD deposits)
 */
export const NATIVE_TOKEN_ADDRESS: Address = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

/**
 * All pod network contract addresses
 */
export const POD_ADDRESSES = {
  CLOB: CLOB_ADDRESS,
  OPTIMISTIC_AUCTION: OPTIMISTIC_AUCTION_ADDRESS,
  BRIDGE: BRIDGE_ADDRESS,
  NATIVE_TOKEN: NATIVE_TOKEN_ADDRESS,
} as const;

export type PodAddresses = typeof POD_ADDRESSES;
