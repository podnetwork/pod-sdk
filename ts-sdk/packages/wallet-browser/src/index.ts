/**
 * @module @podnetwork/wallet-browser
 * @description Lightweight browser wallet integration for Pod Network SDK
 *
 * This package provides browser wallet integration (MetaMask, etc.) without
 * the ethers dependency. Use this package for minimal bundle size in browser
 * applications.
 *
 * For Node.js backend applications or if you need mnemonic/keystore support,
 * use `@podnetwork/wallet` instead.
 *
 * @example
 * ```typescript
 * import { BrowserWalletSigner } from '@podnetwork/wallet-browser';
 *
 * // Check if wallet is available
 * if (BrowserWalletSigner.isAvailable()) {
 *   // Connect to MetaMask
 *   const signer = await BrowserWalletSigner.connect();
 *   console.log(`Connected: ${await signer.getAddress()}`);
 *
 *   // Send a transaction
 *   const txHash = await signer.sendTransaction({
 *     to: '0x...',
 *     value: parsePod('1.0'),
 *   }, 1293n);
 * }
 * ```
 */

export const VERSION = "0.1.0" as const;

// Main signer class
export { BrowserWalletSigner } from "./browser-signer.js";

// Types
export type { EIP1193Provider, BrowserWalletConnectOptions } from "./types.js";

// Utilities
export { bytesToHex } from "./utils.js";

// Add Network to Wallet
export {
  addPodNetworkToWallet,
  switchToPodNetwork,
  isBrowserWalletAvailable,
  getCurrentChainId,
  isConnectedToPodNetwork,
  POD_DEV_NETWORK,
  POD_CHRONOS_DEV_NETWORK,
} from "./add-network.js";

export type { PodNetworkConfig, AddNetworkResult } from "./add-network.js";
