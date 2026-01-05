/**
 * @module components/network-status/network-status-switch-button
 * @description Switch button component for NetworkStatus compound component
 */

import { type ButtonHTMLAttributes, type Ref, useState, useCallback } from "react";
import { Slot } from "../primitives/slot.js";
import { useNetworkStatusContext } from "./network-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for NetworkStatus.SwitchButton component.
 * @category Components
 */
export interface NetworkStatusSwitchButtonProps
  extends BaseComponentProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Called after switch completes (success or failure) */
  readonly onSwitch?: (success: boolean, error?: string) => void;
  /** Child content */
  readonly children?: React.ReactNode;
  /** Ref to the button element */
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * Button component to switch to the correct network.
 *
 * Triggers the network switch flow and shows loading state.
 * Uses data attributes for styling:
 * - `data-switching="true"` while switching
 *
 * @example
 * ```tsx
 * <NetworkStatus.Root>
 *   <NetworkStatus.SwitchButton className="btn btn-primary">
 *     Switch Network
 *   </NetworkStatus.SwitchButton>
 * </NetworkStatus.Root>
 * ```
 *
 * @example
 * ```tsx
 * // With callback
 * <NetworkStatus.SwitchButton
 *   onSwitch={(success, error) => {
 *     if (success) toast.success('Switched!');
 *     else toast.error(error);
 *   }}
 * >
 *   Switch to pod Network
 * </NetworkStatus.SwitchButton>
 * ```
 */
export const NetworkStatusSwitchButton = ({
  onSwitch,
  asChild = false,
  className,
  children,
  disabled,
  ref,
  ...props
}: NetworkStatusSwitchButtonProps): React.ReactNode => {
  const { switchNetwork, isCorrectNetwork, isChecking, networkName } =
    useNetworkStatusContext("NetworkStatus.SwitchButton");
  const [isSwitching, setIsSwitching] = useState(false);

  const handleClick = useCallback(async () => {
    if (isSwitching || isCorrectNetwork) return;

    setIsSwitching(true);
    try {
      const result = await switchNetwork();
      if (onSwitch != null) {
        onSwitch(result.success, result.error);
      }
    } catch (error) {
      if (onSwitch != null) {
        onSwitch(false, error instanceof Error ? error.message : "Failed to switch network");
      }
    } finally {
      setIsSwitching(false);
    }
  }, [isSwitching, isCorrectNetwork, switchNetwork, onSwitch]);

  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled ?? isSwitching ?? isChecking ?? isCorrectNetwork;

  return (
    <Comp
      ref={ref}
      type="button"
      className={className}
      disabled={isDisabled}
      onClick={handleClick}
      aria-busy={isSwitching}
      data-switching={isSwitching}
      data-correct={isCorrectNetwork}
      {...props}
    >
      {children ?? `Switch to ${networkName}`}
    </Comp>
  );
};

NetworkStatusSwitchButton.displayName = "NetworkStatus.SwitchButton";
