/**
 * @module components/network-status/network-status-chain-id
 * @description Chain ID component for NetworkStatus compound component
 */

import { type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useNetworkStatusContext } from "./network-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for NetworkStatus.ChainId component.
 * @category Components
 */
export interface NetworkStatusChainIdProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLSpanElement> {
  /**
   * Which chain ID to display.
   * - 'current': The wallet's current chain ID
   * - 'expected': The expected chain ID from config
   * Default: 'current'
   */
  readonly which?: "current" | "expected";
  /**
   * Format for displaying the chain ID.
   * - 'decimal': Display as decimal number (e.g., "1293")
   * - 'hex': Display as hex (e.g., "0x50d")
   * Default: 'decimal'
   */
  readonly format?: "decimal" | "hex";
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Chain ID component displaying current or expected chain ID.
 *
 * @example
 * ```tsx
 * <NetworkStatus.Root>
 *   <span>Current: <NetworkStatus.ChainId which="current" /></span>
 *   <span>Expected: <NetworkStatus.ChainId which="expected" /></span>
 * </NetworkStatus.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Hex format
 * <NetworkStatus.ChainId format="hex" />
 * {/* Renders: "0x50d" *\/}
 * ```
 */
export const NetworkStatusChainId = ({
  which = "current",
  format = "decimal",
  asChild = false,
  className,
  ref,
  ...props
}: NetworkStatusChainIdProps): React.ReactNode => {
  const { currentChainId, expectedChainId } = useNetworkStatusContext("NetworkStatus.ChainId");

  const chainId = which === "current" ? currentChainId : expectedChainId;

  let displayValue: string;
  if (chainId == null) {
    displayValue = "—";
  } else if (format === "hex") {
    displayValue = `0x${chainId.toString(16)}`;
  } else {
    displayValue = chainId.toString();
  }

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-which={which} data-format={format} {...props}>
      {displayValue}
    </Comp>
  );
};

NetworkStatusChainId.displayName = "NetworkStatus.ChainId";
