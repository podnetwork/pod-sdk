/**
 * @module providers/client-provider
 * @description React context provider for PodClient
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PodClient } from "@podnetwork/core";
import type { NetworkPreset } from "../types.js";

/**
 * Props for ClientProvider.
 * @category Providers
 */
export interface ClientProviderProps {
  /** Pre-configured PodClient instance (highest priority) */
  readonly client?: PodClient;
  /** Network preset (overridden by rpcUrl) */
  readonly network?: NetworkPreset;
  /** Custom RPC endpoint URL */
  readonly rpcUrl?: string;
  /** Custom WebSocket URL */
  readonly wsUrl?: string;
  /** Request timeout in ms. Default: 30000 */
  readonly timeout?: number;
  /** Max retry attempts. Default: 3 */
  readonly maxRetries?: number;
  /** Child components */
  readonly children: ReactNode;
}

/**
 * Context value for ClientProvider.
 * @category Providers
 */
export interface ClientContextValue {
  /** The PodClient instance */
  readonly client: PodClient;
  /** Whether WebSocket is available */
  readonly hasWsSupport: boolean;
}

/**
 * Client context.
 * @internal
 */
const ClientContext = createContext<ClientContextValue | null>(null);
ClientContext.displayName = "PodClientContext";

/**
 * Error thrown when useClient is used outside ClientProvider.
 */
export class ClientProviderError extends Error {
  constructor() {
    super(
      "useClient must be used within a ClientProvider or PodProvider. " +
        "Wrap your component tree with <ClientProvider> or <PodProvider>."
    );
    this.name = "ClientProviderError";
  }
}

/**
 * Get network configuration from preset.
 */
function getNetworkConfig(network: NetworkPreset): { rpcUrl: string; wsUrl?: string } {
  switch (network) {
    case "dev":
      return {
        rpcUrl: "https://rpc.dev.pod.network",
        wsUrl: "wss://ws.dev.pod.network",
      };
    case "local":
      return {
        rpcUrl: "http://localhost:8545",
        wsUrl: "ws://localhost:8546",
      };
    case "chronosDev":
      return {
        rpcUrl: "https://rpc.chronos.dev.pod.network",
        wsUrl: "wss://ws.chronos.dev.pod.network",
      };
    default:
      return {
        rpcUrl: "https://rpc.dev.pod.network",
      };
  }
}

/**
 * Provider component for PodClient.
 *
 * Provides a PodClient instance to all child components via context.
 * The client can be configured via network presets or custom URLs.
 *
 * @example
 * ```tsx
 * import { ClientProvider } from '@podnetwork/react';
 *
 * // Using network preset
 * function App() {
 *   return (
 *     <ClientProvider network="dev">
 *       <YourApp />
 *     </ClientProvider>
 *   );
 * }
 *
 * // Using custom URLs
 * function App() {
 *   return (
 *     <ClientProvider
 *       rpcUrl="https://my-rpc.example.com"
 *       wsUrl="wss://my-ws.example.com"
 *     >
 *       <YourApp />
 *     </ClientProvider>
 *   );
 * }
 *
 * // Using pre-configured client
 * import { PodClient } from '@podnetwork/core';
 *
 * const client = PodClient.dev();
 *
 * function App() {
 *   return (
 *     <ClientProvider client={client}>
 *       <YourApp />
 *     </ClientProvider>
 *   );
 * }
 * ```
 */
export function ClientProvider({
  client: providedClient,
  network = "dev",
  rpcUrl,
  wsUrl,
  timeout,
  maxRetries,
  children,
}: ClientProviderProps): React.JSX.Element {
  const contextValue = useMemo<ClientContextValue>(() => {
    // Use provided client if available
    if (providedClient !== undefined) {
      return {
        client: providedClient,
        hasWsSupport: true, // Assume WS support for provided clients
      };
    }

    // Get network config
    const networkConfig = getNetworkConfig(network);

    // Override with custom URLs if provided
    const finalRpcUrl = rpcUrl ?? networkConfig.rpcUrl;
    const finalWsUrl = wsUrl ?? networkConfig.wsUrl;

    // Create client config, only including defined values
    const clientConfig: {
      url: string;
      wsUrl?: string;
      timeout?: number;
      maxRetries?: number;
    } = { url: finalRpcUrl };

    if (finalWsUrl !== undefined) {
      clientConfig.wsUrl = finalWsUrl;
    }
    if (timeout !== undefined) {
      clientConfig.timeout = timeout;
    }
    if (maxRetries !== undefined) {
      clientConfig.maxRetries = maxRetries;
    }

    const client = new PodClient(clientConfig);

    return {
      client,
      hasWsSupport: finalWsUrl !== undefined && finalWsUrl !== "",
    };
  }, [providedClient, network, rpcUrl, wsUrl, timeout, maxRetries]);

  return <ClientContext.Provider value={contextValue}>{children}</ClientContext.Provider>;
}

/**
 * Hook to access the PodClient instance.
 *
 * @throws {ClientProviderError} If used outside of ClientProvider or PodProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const client = useClient();
 *   // Use client for RPC calls
 *   const balance = await client.getBalance(address);
 * }
 * ```
 */
export function useClient(): PodClient {
  const context = useContext(ClientContext);
  if (context === null) {
    throw new ClientProviderError();
  }
  return context.client;
}

/**
 * Hook to access the full client context including WS support flag.
 *
 * @throws {ClientProviderError} If used outside of ClientProvider or PodProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { client, hasWsSupport } = useClientContext();
 *   if (hasWsSupport) {
 *     // Can use WebSocket subscriptions
 *   }
 * }
 * ```
 */
export function useClientContext(): ClientContextValue {
  const context = useContext(ClientContext);
  if (context === null) {
    throw new ClientProviderError();
  }
  return context;
}

// Export the context for use by PodProvider
export { ClientContext };
