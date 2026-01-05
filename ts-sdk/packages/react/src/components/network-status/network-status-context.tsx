/**
 * @module components/network-status/network-status-context
 * @description Context for NetworkStatus compound component
 */

import { createContext, useContext } from "react";
import type { AddNetworkResult, PodNetworkConfig } from "@podnetwork/wallet-browser";

/**
 * Context value shared within NetworkStatus compound component.
 * @category Components
 */
export interface NetworkStatusContextValue {
  /** Whether network check is in progress */
  readonly isChecking: boolean;
  /** Whether wallet is connected to the correct network */
  readonly isCorrectNetwork: boolean;
  /** Current chain ID from the wallet */
  readonly currentChainId: bigint | null;
  /** Expected chain ID from the network config */
  readonly expectedChainId: bigint;
  /** Network name from config */
  readonly networkName: string;
  /** Switch to the configured network */
  readonly switchNetwork: () => Promise<AddNetworkResult>;
  /** Add the network to wallet */
  readonly addNetwork: () => Promise<AddNetworkResult>;
  /** The network configuration */
  readonly network: PodNetworkConfig;
}

/**
 * NetworkStatus context.
 * @internal
 */
export const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(null);
NetworkStatusContext.displayName = "NetworkStatusContext";

/**
 * Hook to access the NetworkStatus context.
 *
 * @param componentName - Name of the component for error message
 * @throws Error if used outside NetworkStatus.Root
 *
 * @internal
 */
export function useNetworkStatusContext(componentName: string): NetworkStatusContextValue {
  const context = useContext(NetworkStatusContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <NetworkStatus.Root>. ` +
        `Wrap your component with <NetworkStatus.Root>.`
    );
  }
  return context;
}
