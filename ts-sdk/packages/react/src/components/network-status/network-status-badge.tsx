/**
 * @module components/network-status/network-status-badge
 * @description Badge component for NetworkStatus compound component
 */

import { type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useNetworkStatusContext } from "./network-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for NetworkStatus.Badge component.
 * @category Components
 */
export interface NetworkStatusBadgeProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLSpanElement> {
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Badge component showing network status.
 *
 * Renders a visual indicator for network connection status.
 * Uses data attributes for styling:
 * - `data-correct="true"` when on the correct network
 * - `data-correct="false"` when on the wrong network
 * - `data-checking="true"` while checking
 *
 * @example
 * ```tsx
 * <NetworkStatus.Root>
 *   <NetworkStatus.Badge className="w-2 h-2 rounded-full" />
 * </NetworkStatus.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Style based on data attributes
 * <style>
 *   [data-correct="true"] { background: green; }
 *   [data-correct="false"] { background: red; }
 *   [data-checking="true"] { background: yellow; }
 * </style>
 * ```
 */
export const NetworkStatusBadge = ({
  asChild = false,
  className,
  ref,
  ...props
}: NetworkStatusBadgeProps): React.ReactNode => {
  const { isCorrectNetwork, isChecking } = useNetworkStatusContext("NetworkStatus.Badge");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      className={className}
      role="status"
      aria-label={
        isChecking
          ? "Checking network..."
          : isCorrectNetwork
            ? "Connected to correct network"
            : "Wrong network"
      }
      data-correct={!isChecking && isCorrectNetwork}
      data-checking={isChecking}
      {...props}
    />
  );
};

NetworkStatusBadge.displayName = "NetworkStatus.Badge";
