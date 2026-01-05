/**
 * @module components/network-status/network-status-name
 * @description Name component for NetworkStatus compound component
 */

import { type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useNetworkStatusContext } from "./network-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for NetworkStatus.Name component.
 * @category Components
 */
export interface NetworkStatusNameProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLSpanElement> {
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Name component displaying the expected network name.
 *
 * @example
 * ```tsx
 * <NetworkStatus.Root network={POD_CHRONOS_DEV_NETWORK}>
 *   <NetworkStatus.Name className="font-medium" />
 *   {/* Renders: "Chronos devnet" *\/}
 * </NetworkStatus.Root>
 * ```
 */
export const NetworkStatusName = ({
  asChild = false,
  className,
  ref,
  children,
  ...props
}: NetworkStatusNameProps): React.ReactNode => {
  const { networkName } = useNetworkStatusContext("NetworkStatus.Name");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? networkName}
    </Comp>
  );
};

NetworkStatusName.displayName = "NetworkStatus.Name";
