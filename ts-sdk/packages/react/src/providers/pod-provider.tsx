/**
 * @module providers/pod-provider
 * @description Unified provider combining ClientProvider and WalletProvider
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PodClient } from "@podnetwork/core";
import { ClientProvider, useClientContext, type ClientProviderProps } from "./client-provider.js";
import { WalletProvider } from "./wallet-provider.js";
import { useWallet } from "../hooks/use-wallet.js";
import type { UseWalletReturn } from "../types.js";

/**
 * Props for PodProvider.
 * @category Providers
 */
export interface PodProviderProps extends ClientProviderProps {
  /** Enable wallet connection support. Default: true */
  readonly enableWallet?: boolean;
}

/**
 * Combined context value from PodProvider.
 * @category Providers
 */
export interface PodContextValue {
  /** The PodClient instance */
  readonly client: PodClient;
  /** Whether WebSocket is available */
  readonly hasWsSupport: boolean;
  /** Wallet context (null when enableWallet is false) */
  readonly wallet: UseWalletReturn | null;
}

/**
 * Pod context for unified access.
 * @internal
 */
const PodContext = createContext<PodContextValue | null>(null);
PodContext.displayName = "PodContext";

/**
 * Error thrown when usePod is used outside PodProvider.
 */
export class PodProviderError extends Error {
  constructor() {
    super(
      "usePod must be used within a PodProvider. " + "Wrap your component tree with <PodProvider>."
    );
    this.name = "PodProviderError";
  }
}

/**
 * Internal component that consumes client context and optionally wallet context.
 */
function PodContextProvider({
  enableWallet,
  children,
}: {
  enableWallet: boolean;
  children: ReactNode;
}): React.JSX.Element {
  const clientContext = useClientContext();

  // Conditionally render wallet provider
  if (enableWallet) {
    return (
      <WalletProvider>
        <PodContextWithWallet clientContext={clientContext}>{children}</PodContextWithWallet>
      </WalletProvider>
    );
  }

  // No wallet support
  const contextValue = useMemo<PodContextValue>(
    () => ({
      client: clientContext.client,
      hasWsSupport: clientContext.hasWsSupport,
      wallet: null,
    }),
    [clientContext]
  );

  return <PodContext.Provider value={contextValue}>{children}</PodContext.Provider>;
}

/**
 * Internal component that combines client and wallet contexts.
 */
function PodContextWithWallet({
  clientContext,
  children,
}: {
  clientContext: { client: PodClient; hasWsSupport: boolean };
  children: ReactNode;
}): React.JSX.Element {
  const wallet = useWallet();

  const contextValue = useMemo<PodContextValue>(
    () => ({
      client: clientContext.client,
      hasWsSupport: clientContext.hasWsSupport,
      wallet,
    }),
    [clientContext, wallet]
  );

  return <PodContext.Provider value={contextValue}>{children}</PodContext.Provider>;
}

/**
 * Unified provider that combines ClientProvider and optionally WalletProvider.
 *
 * This is the recommended way to set up the pod SDK in your React app.
 * It provides both client and wallet functionality through a single provider.
 *
 * @example
 * ```tsx
 * import { PodProvider } from '@podnetwork/react';
 *
 * function App() {
 *   return (
 *     <PodProvider network="dev">
 *       <MyDApp />
 *     </PodProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom configuration
 * import { PodProvider, PodClient } from '@podnetwork/react';
 *
 * const client = new PodClient({
 *   url: 'https://my-rpc.example.com',
 *   wsUrl: 'wss://my-ws.example.com',
 * });
 *
 * function App() {
 *   return (
 *     <PodProvider client={client} enableWallet={true}>
 *       <MyDApp />
 *     </PodProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Without wallet support
 * function App() {
 *   return (
 *     <PodProvider network="dev" enableWallet={false}>
 *       <ReadOnlyDApp />
 *     </PodProvider>
 *   );
 * }
 * ```
 */
export function PodProvider({
  enableWallet = true,
  children,
  ...clientProps
}: PodProviderProps): React.JSX.Element {
  return (
    <ClientProvider {...clientProps}>
      <PodContextProvider enableWallet={enableWallet}>{children}</PodContextProvider>
    </ClientProvider>
  );
}

/**
 * Hook to access the full PodContext.
 *
 * Provides access to both client and wallet functionality.
 *
 * @throws {PodProviderError} If used outside of PodProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { client, wallet, hasWsSupport } = usePod();
 *
 *   if (wallet?.isConnected) {
 *     // User is connected
 *   }
 *
 *   // Use client for RPC calls
 *   const balance = await client.getBalance(address);
 * }
 * ```
 */
export function usePod(): PodContextValue {
  const context = useContext(PodContext);
  if (context === null) {
    throw new PodProviderError();
  }
  return context;
}
