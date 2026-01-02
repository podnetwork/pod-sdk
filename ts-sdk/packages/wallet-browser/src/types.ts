/**
 * @module types
 * @description EIP-1193 provider types for browser wallet integration
 */

/**
 * EIP-1193 provider interface.
 *
 * This is the standard interface exposed by browser wallets like MetaMask.
 * @see https://eips.ethereum.org/EIPS/eip-1193
 */
export interface EIP1193Provider {
  /**
   * Send a JSON-RPC request to the provider.
   *
   * @param args - The request arguments
   * @param args.method - The RPC method name (e.g., 'eth_requestAccounts')
   * @param args.params - Optional array of parameters
   * @returns The result of the RPC call
   */
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;

  /**
   * Register an event listener.
   *
   * @param event - Event name ('accountsChanged', 'chainChanged', 'disconnect')
   * @param listener - Callback function
   */
  on?(event: string, listener: (...args: unknown[]) => void): void;

  /**
   * Remove an event listener.
   *
   * @param event - Event name
   * @param listener - The listener to remove
   */
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

/**
 * Options for connecting to a browser wallet.
 */
export interface BrowserWalletConnectOptions {
  /**
   * Custom EIP-1193 provider.
   *
   * If not provided, uses `window.ethereum`.
   */
  provider?: EIP1193Provider;

  /**
   * Account index to use if multiple accounts are available.
   *
   * @default 0
   */
  accountIndex?: number;
}
