/**
 * @module @podnetwork/wallet
 * @description Wallet functionality for Pod Network SDK
 *
 * This package provides wallet management for signing transactions
 * and messages on the Pod Network.
 *
 * @example
 * ```typescript
 * import { Wallet, Mnemonic, saveKeystore, loadKeystore } from '@podnetwork/wallet';
 * import { BrowserWalletSigner } from '@podnetwork/wallet-browser';
 *
 * // Generate a new wallet
 * const wallet = Wallet.generate();
 * console.log(`Address: ${wallet.address}`);
 *
 * // Or from mnemonic
 * const mnemonic = Mnemonic.generate();
 * const hdWallet = Wallet.fromMnemonic(mnemonic, 0);
 *
 * // Save encrypted keystore
 * const keystore = await saveKeystore(wallet, 'password');
 *
 * // Use with PodClient
 * const pending = await client.tx.sendTransaction({
 *   to: '0x...',
 *   value: parsePod('1.0'),
 * }, wallet);
 *
 * // Or use browser wallet (MetaMask)
 * if (BrowserWalletSigner.isAvailable()) {
 *   const browserSigner = await BrowserWalletSigner.connect();
 *   const pending = await client.tx.sendTransaction({
 *     to: '0x...',
 *     value: parsePod('1.0'),
 *   }, browserSigner);
 * }
 * ```
 */

export const VERSION = "0.1.0" as const;

// Mnemonic
export { Mnemonic, DEFAULT_DERIVATION_PATH } from "./mnemonic.js";
export type { MnemonicWordCount } from "./mnemonic.js";

// Wallet
export { Wallet } from "./wallet.js";

// Browser wallet signer - re-exported from @podnetwork/wallet-browser
export { BrowserWalletSigner } from "@podnetwork/wallet-browser";
export type { EIP1193Provider, BrowserWalletConnectOptions } from "@podnetwork/wallet-browser";

// Keystore
export { saveKeystore, loadKeystore, isValidKeystore, getKeystoreAddress } from "./keystore.js";
export type { KeystoreV3, KeystoreOptions } from "./keystore.js";

// Browser utilities
export { warnBrowserPrivateKey } from "./browser-warning.js";
