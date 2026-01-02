/**
 * @module hooks/use-wallet
 * @description Main wallet hook for React applications
 */

import { useContext, useCallback, useMemo } from "react";
import { Wallet, Mnemonic } from "@podnetwork/wallet";
import { BrowserWalletSigner } from "@podnetwork/wallet-browser";
import { PodError } from "@podnetwork/core";

import { WalletContext } from "../providers/wallet-provider.js";
import type { UseWalletReturn, ConnectOptions, WalletType } from "../types.js";

/**
 * Error thrown when useWallet is used outside WalletProvider.
 */
export class WalletProviderError extends Error {
  constructor() {
    super(
      "useWallet must be used within a WalletProvider. " +
        "Wrap your component tree with <WalletProvider>."
    );
    this.name = "WalletProviderError";
  }
}

/**
 * Access wallet state and actions from any component.
 *
 * Must be used within a `WalletProvider`.
 *
 * @returns Wallet state, computed values, and actions
 * @throws {WalletProviderError} If used outside of WalletProvider
 *
 * @example
 * ```tsx
 * function WalletButton() {
 *   const {
 *     status,
 *     address,
 *     isConnected,
 *     connect,
 *     disconnect,
 *     generateWallet,
 *     isBrowserAvailable,
 *   } = useWallet();
 *
 *   if (status === "connecting") {
 *     return <span>Connecting...</span>;
 *   }
 *
 *   if (isConnected) {
 *     return (
 *       <div>
 *         <span>{address}</span>
 *         <button onClick={disconnect}>Disconnect</button>
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <div>
 *       <button onClick={() => connect({ type: "browser" })}>
 *         Connect Browser Wallet
 *       </button>
 *       <button onClick={generateWallet}>
 *         Generate New Wallet
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWallet(): UseWalletReturn {
  const context = useContext(WalletContext);

  if (context === null) {
    throw new WalletProviderError();
  }

  const { state, dispatch } = context;

  // Actions
  const connect = useCallback(
    async (options: ConnectOptions): Promise<void> => {
      const walletType: WalletType = options.type === "browser" ? "browser" : "local";
      dispatch({ type: "CONNECT_START", walletType });

      try {
        switch (options.type) {
          case "browser": {
            const connectOptions =
              options.provider !== undefined ? { provider: options.provider } : undefined;
            const signer = await BrowserWalletSigner.connect(connectOptions);
            const address = await signer.getAddress();
            dispatch({ type: "CONNECT_SUCCESS", signer, address, walletType: "browser" });
            break;
          }

          case "privateKey": {
            const wallet = Wallet.fromPrivateKey(options.privateKey);
            const address = await wallet.getAddress();
            dispatch({ type: "CONNECT_SUCCESS", signer: wallet, address, walletType: "local" });
            break;
          }

          case "mnemonic": {
            const mnemonic = Mnemonic.fromPhrase(options.phrase);
            const wallet = Wallet.fromMnemonic(mnemonic, options.index ?? 0);
            const address = await wallet.getAddress();
            dispatch({ type: "CONNECT_SUCCESS", signer: wallet, address, walletType: "local" });
            break;
          }

          case "generate": {
            const wallet = Wallet.generate();
            const address = await wallet.getAddress();
            dispatch({ type: "CONNECT_SUCCESS", signer: wallet, address, walletType: "local" });
            break;
          }
        }
      } catch (error) {
        dispatch({ type: "CONNECT_ERROR", error: PodError.from(error) });
      }
    },
    [dispatch]
  );

  const disconnect = useCallback((): void => {
    dispatch({ type: "DISCONNECT" });
  }, [dispatch]);

  const generateWallet = useCallback(async (): Promise<void> => {
    await connect({ type: "generate" });
  }, [connect]);

  const isBrowserAvailable = useCallback((): boolean => {
    return BrowserWalletSigner.isAvailable();
  }, []);

  // Computed values
  const isConnected = state.status === "connected";
  const isBrowserWallet = isConnected && state.walletType === "browser";
  const isLocalWallet = isConnected && state.walletType === "local";

  return useMemo(
    () => ({
      // State
      status: state.status,
      signer: state.signer,
      address: state.address,
      walletType: state.walletType,
      error: state.error,

      // Computed
      isConnected,
      isBrowserWallet,
      isLocalWallet,

      // Actions
      connect,
      disconnect,

      // Utilities
      generateWallet,
      isBrowserAvailable,
    }),
    [
      state.status,
      state.signer,
      state.address,
      state.walletType,
      state.error,
      isConnected,
      isBrowserWallet,
      isLocalWallet,
      connect,
      disconnect,
      generateWallet,
      isBrowserAvailable,
    ]
  );
}
