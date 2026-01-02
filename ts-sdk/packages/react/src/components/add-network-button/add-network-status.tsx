/**
 * @module components/add-network-button/add-network-status
 * @description Status display component for AddNetworkButton compound component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAddNetworkButtonContext, type AddNetworkStatus } from "./add-network-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for AddNetworkButton.Status component.
 * @category Components
 */
export interface AddNetworkButtonStatusProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Custom labels for each status */
  readonly labels?: Partial<Record<AddNetworkStatus, string>>;
  /** Whether to show the status when idle */
  readonly showIdle?: boolean;
  /** Whether to show the network name */
  readonly showNetworkName?: boolean;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

const DEFAULT_LABELS: Record<AddNetworkStatus, string> = {
  idle: "",
  adding: "Adding network...",
  success: "Network added",
  error: "Failed to add network",
};

/**
 * Displays the current status of the add network operation.
 *
 * @example
 * ```tsx
 * <AddNetworkButton.Root>
 *   <AddNetworkButton.Trigger>Add Network</AddNetworkButton.Trigger>
 *   <AddNetworkButton.Status />
 * </AddNetworkButton.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Custom labels
 * <AddNetworkButton.Status
 *   labels={{
 *     adding: "Please wait...",
 *     success: "All done!",
 *     error: "Oops, something went wrong"
 *   }}
 * />
 * ```
 */
export const AddNetworkButtonStatus = ({
  labels,
  showIdle = false,
  showNetworkName = false,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AddNetworkButtonStatusProps): React.ReactNode => {
  const { status, error, network, isConnected } =
    useAddNetworkButtonContext("AddNetworkButton.Status");

  const mergedLabels = useMemo<Record<AddNetworkStatus, string>>(
    () => ({
      ...DEFAULT_LABELS,
      ...labels,
    }),
    [labels]
  );

  // Get the display text
  let displayText = mergedLabels[status];

  // For error status, include the actual error message if available
  if (status === "error" && error != null) {
    displayText = error;
  }

  // For success, optionally include network name
  if (status === "success" && showNetworkName) {
    displayText = `Connected to ${network.chainName}`;
  }

  // If connected and idle, show connected status
  if (status === "idle" && isConnected && showNetworkName) {
    displayText = `Connected to ${network.chainName}`;
  }

  // Don't render if idle and showIdle is false and not connected
  if (status === "idle" && !showIdle && !isConnected) {
    return null;
  }

  // Don't render if idle and not showing network name and no custom idle label
  if (status === "idle" && !showNetworkName && (labels?.idle == null || labels.idle === "")) {
    return null;
  }

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      className={className}
      data-status={status}
      data-connected={isConnected}
      aria-live="polite"
      {...props}
    >
      {children ?? displayText}
    </Comp>
  );
};

AddNetworkButtonStatus.displayName = "AddNetworkButton.Status";
