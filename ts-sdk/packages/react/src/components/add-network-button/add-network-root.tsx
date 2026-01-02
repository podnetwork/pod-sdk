/**
 * @module components/add-network-button/add-network-root
 * @description Root component for AddNetworkButton compound component
 */

import { useState, useCallback, useEffect, useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import {
  AddNetworkButtonContext,
  type AddNetworkButtonContextValue,
  type AddNetworkStatus,
} from "./add-network-context.js";
import {
  addPodNetworkToWallet,
  isBrowserWalletAvailable,
  isConnectedToPodNetwork,
  POD_DEV_NETWORK,
  type PodNetworkConfig,
  type AddNetworkResult,
} from "@podnetwork/wallet-browser";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for AddNetworkButton.Root component.
 * @category Components
 */
export interface AddNetworkButtonRootProps
  extends BaseComponentProps, Omit<HTMLAttributes<HTMLDivElement>, "onError"> {
  /** Network configuration to add. Defaults to POD_DEV_NETWORK. */
  readonly network?: PodNetworkConfig;
  /** Callback when network is successfully added */
  readonly onAddSuccess?: (result: AddNetworkResult) => void;
  /** Callback when adding fails */
  readonly onAddError?: (error: string) => void;
  /** Auto-refresh connection status interval in ms. Set to 0 to disable. Default: 5000 */
  readonly refreshInterval?: number;
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for the AddNetworkButton compound component.
 *
 * Provides context for child components and manages the add network state.
 *
 * @example
 * ```tsx
 * <AddNetworkButton.Root network={POD_DEV_NETWORK}>
 *   <AddNetworkButton.Trigger>
 *     Add Pod Network
 *   </AddNetworkButton.Trigger>
 *   <AddNetworkButton.Status />
 * </AddNetworkButton.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Using asChild to customize the container
 * <AddNetworkButton.Root network={POD_CHRONOS_DEV_NETWORK} asChild>
 *   <div className="custom-wrapper">
 *     <AddNetworkButton.Trigger>Connect</AddNetworkButton.Trigger>
 *   </div>
 * </AddNetworkButton.Root>
 * ```
 */
export const AddNetworkButtonRoot = ({
  network = POD_DEV_NETWORK,
  onAddSuccess,
  onAddError,
  refreshInterval = 5000,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AddNetworkButtonRootProps): React.ReactNode => {
  const [status, setStatus] = useState<AddNetworkStatus>("idle");
  const [result, setResult] = useState<AddNetworkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWalletAvailable, setIsWalletAvailable] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check wallet availability on mount
  useEffect(() => {
    setIsWalletAvailable(isBrowserWalletAvailable());
  }, []);

  // Check connection status periodically
  useEffect(() => {
    const checkConnection = (): void => {
      void isConnectedToPodNetwork(network).then((connected) => {
        setIsConnected(connected);
      });
    };

    checkConnection();

    if (refreshInterval > 0) {
      const interval = setInterval(checkConnection, refreshInterval);
      return (): void => {
        clearInterval(interval);
      };
    }
    return undefined;
  }, [network, refreshInterval]);

  const addNetwork = useCallback(async (): Promise<AddNetworkResult> => {
    setStatus("adding");
    setError(null);

    try {
      const addResult = await addPodNetworkToWallet(network);
      setResult(addResult);

      if (addResult.success) {
        setStatus("success");
        setIsConnected(true);
        onAddSuccess?.(addResult);
      } else {
        setStatus("error");
        const errorMessage = addResult.error ?? "Failed to add network";
        setError(errorMessage);
        onAddError?.(errorMessage);
      }

      return addResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setStatus("error");
      setError(errorMessage);
      onAddError?.(errorMessage);

      const failedResult: AddNetworkResult = {
        success: false,
        wasAdded: false,
        wasSwitched: false,
        error: errorMessage,
      };
      setResult(failedResult);
      return failedResult;
    }
  }, [network, onAddSuccess, onAddError]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
  }, []);

  const contextValue = useMemo<AddNetworkButtonContextValue>(
    () => ({
      network,
      status,
      isAdding: status === "adding",
      isSuccess: status === "success",
      isError: status === "error",
      result,
      error,
      isWalletAvailable,
      isConnected,
      addNetwork,
      reset,
    }),
    [network, status, result, error, isWalletAvailable, isConnected, addNetwork, reset]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <AddNetworkButtonContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-status={status}
        data-connected={isConnected}
        data-wallet-available={isWalletAvailable}
        {...props}
      >
        {children}
      </Comp>
    </AddNetworkButtonContext.Provider>
  );
};

AddNetworkButtonRoot.displayName = "AddNetworkButton.Root";
