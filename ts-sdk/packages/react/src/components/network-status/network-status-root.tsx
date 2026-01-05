/**
 * @module components/network-status/network-status-root
 * @description Root component for NetworkStatus compound component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { POD_CHRONOS_DEV_NETWORK, type PodNetworkConfig } from "@podnetwork/wallet-browser";
import { useNetworkValidation } from "../../hooks/use-network-validation.js";
import { NetworkStatusContext, type NetworkStatusContextValue } from "./network-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for NetworkStatus.Root component.
 * @category Components
 */
export interface NetworkStatusRootProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /**
   * Target network configuration.
   * @default POD_CHRONOS_DEV_NETWORK
   */
  readonly network?: PodNetworkConfig;
  /** Callback when network validation changes */
  readonly onNetworkChange?: (isCorrectNetwork: boolean) => void;
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for the NetworkStatus compound component.
 *
 * Provides context for child components and manages network validation state.
 * Uses the `useNetworkValidation` hook internally.
 *
 * @example
 * ```tsx
 * <NetworkStatus.Root>
 *   <NetworkStatus.Badge />
 *   <NetworkStatus.Name />
 * </NetworkStatus.Root>
 * ```
 *
 * @example
 * ```tsx
 * // With custom network and callback
 * <NetworkStatus.Root
 *   network={POD_DEV_NETWORK}
 *   onNetworkChange={(correct) => console.log('Network:', correct)}
 * >
 *   <NetworkStatus.Badge />
 *   <NetworkStatus.SwitchButton>Switch Network</NetworkStatus.SwitchButton>
 * </NetworkStatus.Root>
 * ```
 */
export const NetworkStatusRoot = ({
  network = POD_CHRONOS_DEV_NETWORK,
  onNetworkChange,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: NetworkStatusRootProps): React.ReactNode => {
  const validation = useNetworkValidation({ network });

  // Call callback when network status changes
  useMemo(() => {
    if (onNetworkChange != null) {
      onNetworkChange(validation.isCorrectNetwork);
    }
  }, [validation.isCorrectNetwork, onNetworkChange]);

  const contextValue = useMemo<NetworkStatusContextValue>(
    () => ({
      isChecking: validation.isChecking,
      isCorrectNetwork: validation.isCorrectNetwork,
      currentChainId: validation.currentChainId,
      expectedChainId: validation.expectedChainId,
      networkName: network.chainName,
      switchNetwork: validation.switchNetwork,
      addNetwork: validation.addNetwork,
      network,
    }),
    [
      validation.isChecking,
      validation.isCorrectNetwork,
      validation.currentChainId,
      validation.expectedChainId,
      validation.switchNetwork,
      validation.addNetwork,
      network,
    ]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <NetworkStatusContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-correct={validation.isCorrectNetwork}
        data-checking={validation.isChecking}
        {...props}
      >
        {children}
      </Comp>
    </NetworkStatusContext.Provider>
  );
};

NetworkStatusRoot.displayName = "NetworkStatus.Root";
