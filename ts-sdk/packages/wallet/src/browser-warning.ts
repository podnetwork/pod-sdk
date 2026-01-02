/**
 * @module browser-warning
 * @description Browser environment detection and security warnings
 */

import { isBrowser } from "@podnetwork/core";

/**
 * Whether the browser warning has been shown.
 * We only show it once per session to avoid spam.
 */
let browserWarningShown = false;

/**
 * Emit a console warning when private keys are used in browser.
 *
 * This warning is shown once per session to alert developers about
 * the security implications of using private keys directly in browser
 * applications.
 *
 * **Best Practice**: For production browser applications, use
 * `BrowserWalletSigner` with MetaMask or other browser extension wallets
 * instead of managing private keys directly.
 *
 * @example
 * ```typescript
 * // Called internally by Wallet.fromPrivateKey, Wallet.generate, etc.
 * warnBrowserPrivateKey();
 * ```
 */
export function warnBrowserPrivateKey(): void {
  if (!isBrowser() || browserWarningShown) {
    return;
  }

  browserWarningShown = true;

  console.warn(
    `[pod-sdk/wallet] Security Warning: Using private keys directly in a browser environment.

For production applications, consider using BrowserWalletSigner with MetaMask or
similar browser extension wallets instead.

Direct private key usage in browsers can expose keys to:
- Browser extensions
- Cross-site scripting (XSS) attacks
- Browser developer tools
- JavaScript memory inspection

See: https://docs.pod.network/sdk/browser-security`
  );
}

/**
 * Reset the browser warning state.
 *
 * @internal Used for testing
 */
export function resetBrowserWarning(): void {
  browserWarningShown = false;
}
