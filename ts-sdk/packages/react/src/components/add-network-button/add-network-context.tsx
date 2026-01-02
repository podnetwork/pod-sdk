/**
 * @module components/add-network-button/add-network-context
 * @description Context for AddNetworkButton compound component
 */

import { createContext, useContext } from "react";
import type { PodNetworkConfig, AddNetworkResult } from "@podnetwork/wallet-browser";

/**
 * Status of the add network operation.
 */
export type AddNetworkStatus = "idle" | "adding" | "success" | "error";

/**
 * Context value shared within AddNetworkButton compound component.
 * @category Components
 */
export interface AddNetworkButtonContextValue {
  /** The network configuration */
  readonly network: PodNetworkConfig;
  /** Current status of the operation */
  readonly status: AddNetworkStatus;
  /** Whether the operation is in progress */
  readonly isAdding: boolean;
  /** Whether the network was successfully added */
  readonly isSuccess: boolean;
  /** Whether there was an error */
  readonly isError: boolean;
  /** Result of the last operation */
  readonly result: AddNetworkResult | null;
  /** Error message if operation failed */
  readonly error: string | null;
  /** Whether a browser wallet is available */
  readonly isWalletAvailable: boolean;
  /** Whether currently connected to the target network */
  readonly isConnected: boolean;
  /** Function to add/switch to the network */
  readonly addNetwork: () => Promise<AddNetworkResult>;
  /** Reset the state */
  readonly reset: () => void;
}

/**
 * AddNetworkButton context.
 * @internal
 */
export const AddNetworkButtonContext = createContext<AddNetworkButtonContextValue | null>(null);
AddNetworkButtonContext.displayName = "AddNetworkButtonContext";

/**
 * Hook to access the AddNetworkButton context.
 *
 * @param componentName - Name of the component for error message
 * @throws Error if used outside AddNetworkButton.Root
 *
 * @internal
 */
export function useAddNetworkButtonContext(componentName: string): AddNetworkButtonContextValue {
  const context = useContext(AddNetworkButtonContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <AddNetworkButton.Root>. ` +
        `Wrap your component with <AddNetworkButton.Root network={...}>.`
    );
  }
  return context;
}
