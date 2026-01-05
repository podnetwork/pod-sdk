/**
 * @module hooks/use-network-validation
 * @description Hook for validating wallet network connection
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getCurrentChainId,
  isConnectedToPodNetwork,
  switchToPodNetwork,
  addPodNetworkToWallet,
  POD_CHRONOS_DEV_NETWORK,
  type PodNetworkConfig,
  type AddNetworkResult,
  type EIP1193Provider,
} from "@podnetwork/wallet-browser";
import { isBrowser } from "@podnetwork/core";

import { useWallet } from "./use-wallet.js";

/**
 * Options for the useNetworkValidation hook.
 */
export interface UseNetworkValidationOptions {
  /**
   * Network configuration to validate against.
   * @default POD_CHRONOS_DEV_NETWORK
   */
  network?: PodNetworkConfig;
}

/**
 * Result returned by the useNetworkValidation hook.
 */
export interface UseNetworkValidationResult {
  /** Whether network check is in progress */
  isChecking: boolean;
  /** Whether wallet is connected to the correct network */
  isCorrectNetwork: boolean;
  /** Current chain ID from the wallet */
  currentChainId: bigint | null;
  /** Expected chain ID from the network config */
  expectedChainId: bigint;
  /** Switch to the configured network (adds if not present) */
  switchNetwork: () => Promise<AddNetworkResult>;
  /** Add the network to the wallet without switching */
  addNetwork: () => Promise<AddNetworkResult>;
}

/**
 * Hook to validate that the connected wallet is on the correct pod network.
 *
 * Only performs network validation when a wallet is connected. Automatically
 * listens for network changes via the `chainChanged` event.
 *
 * @param options - Configuration options
 * @returns Network validation state and actions
 *
 * @example
 * ```tsx
 * function NetworkGuard({ children }: { children: React.ReactNode }) {
 *   const { isCorrectNetwork, isChecking, switchNetwork } = useNetworkValidation();
 *
 *   if (isChecking) {
 *     return <span>Checking network...</span>;
 *   }
 *
 *   if (!isCorrectNetwork) {
 *     return (
 *       <div>
 *         <p>Please switch to the pod network</p>
 *         <button onClick={switchNetwork}>Switch Network</button>
 *       </div>
 *     );
 *   }
 *
 *   return <>{children}</>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom network
 * const { isCorrectNetwork } = useNetworkValidation({
 *   network: POD_DEV_NETWORK,
 * });
 * ```
 */
export function useNetworkValidation(
  options: UseNetworkValidationOptions = {}
): UseNetworkValidationResult {
  const { network = POD_CHRONOS_DEV_NETWORK } = options;

  const { status } = useWallet();
  const [isChecking, setIsChecking] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [currentChainId, setCurrentChainId] = useState<bigint | null>(null);

  const expectedChainId = network.chainId;

  // Check network when wallet is connected
  useEffect(() => {
    if (status !== "connected") {
      // Reset to default state when disconnected
      setIsCorrectNetwork(true);
      setCurrentChainId(null);
      return;
    }

    let cancelled = false;

    async function checkNetwork(): Promise<void> {
      setIsChecking(true);
      try {
        const [chainId, isCorrect] = await Promise.all([
          getCurrentChainId(),
          isConnectedToPodNetwork(network),
        ]);

        if (!cancelled) {
          setCurrentChainId(chainId);
          setIsCorrectNetwork(isCorrect);
        }
      } catch (error) {
        // On error, assume correct to avoid blocking the user
        console.error("[useNetworkValidation] Failed to check network:", error);
        if (!cancelled) {
          setIsCorrectNetwork(true);
        }
      } finally {
        if (!cancelled) {
          setIsChecking(false);
        }
      }
    }

    checkNetwork();

    // Listen for chain changes
    const handleChainChanged = (): void => {
      checkNetwork();
    };

    if (isBrowser()) {
      const ethereum = getEthereumProvider();
      if (ethereum?.on != null) {
        ethereum.on("chainChanged", handleChainChanged);
      }
    }

    return () => {
      cancelled = true;
      if (isBrowser()) {
        const ethereum = getEthereumProvider();
        if (ethereum?.removeListener != null) {
          ethereum.removeListener("chainChanged", handleChainChanged);
        }
      }
    };
  }, [status, network]);

  // Switch to the configured network
  const switchNetwork = useCallback(async (): Promise<AddNetworkResult> => {
    const result = await addPodNetworkToWallet(network);
    return result;
  }, [network]);

  // Add the network without switching
  const addNetwork = useCallback(async (): Promise<AddNetworkResult> => {
    const result = await switchToPodNetwork(network);
    return result;
  }, [network]);

  return useMemo(
    () => ({
      isChecking,
      isCorrectNetwork,
      currentChainId,
      expectedChainId,
      switchNetwork,
      addNetwork,
    }),
    [isChecking, isCorrectNetwork, currentChainId, expectedChainId, switchNetwork, addNetwork]
  );
}

/**
 * Get the Ethereum provider from the window object.
 */
function getEthereumProvider(): EIP1193Provider | undefined {
  if (!isBrowser()) {
    return undefined;
  }

  const win = globalThis as typeof globalThis & {
    ethereum?: EIP1193Provider;
  };

  return win.ethereum;
}
