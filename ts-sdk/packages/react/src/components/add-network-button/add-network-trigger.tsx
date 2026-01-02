/**
 * @module components/add-network-button/add-network-trigger
 * @description Trigger component for AddNetworkButton compound component
 */

import type { ButtonHTMLAttributes, MouseEvent, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAddNetworkButtonContext } from "./add-network-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for AddNetworkButton.Trigger component.
 * @category Components
 */
export interface AddNetworkButtonTriggerProps
  extends BaseComponentProps, ButtonHTMLAttributes<HTMLButtonElement> {
  /** Text to show when already connected. Set to null to hide when connected. */
  readonly connectedText?: string | null;
  /** Text to show when wallet is not available */
  readonly noWalletText?: string;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * Trigger button that adds the Pod network to the user's wallet.
 *
 * This component renders a button that, when clicked, prompts the user
 * to add or switch to the Pod network in their browser wallet.
 *
 * @example
 * ```tsx
 * <AddNetworkButton.Root>
 *   <AddNetworkButton.Trigger>
 *     Add Pod Network
 *   </AddNetworkButton.Trigger>
 * </AddNetworkButton.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Custom styling with asChild
 * <AddNetworkButton.Root>
 *   <AddNetworkButton.Trigger asChild>
 *     <button className="custom-button">
 *       Add Network
 *     </button>
 *   </AddNetworkButton.Trigger>
 * </AddNetworkButton.Root>
 * ```
 */
export const AddNetworkButtonTrigger = ({
  connectedText = "Connected",
  noWalletText = "Install Wallet",
  asChild = false,
  className,
  disabled,
  onClick,
  children,
  ref,
  ...props
}: AddNetworkButtonTriggerProps): React.ReactNode => {
  const { isWalletAvailable, isConnected, isAdding, addNetwork } = useAddNetworkButtonContext(
    "AddNetworkButton.Trigger"
  );

  const handleClick = (e: MouseEvent<HTMLButtonElement>): void => {
    onClick?.(e);
    if (!e.defaultPrevented) {
      void addNetwork();
    }
  };

  // Determine if button should be disabled
  const isDisabled = disabled === true || isAdding || !isWalletAvailable;

  // Determine button content
  let content = children;
  if (!isWalletAvailable) {
    content = noWalletText;
  } else if (isConnected && connectedText !== null) {
    content = connectedText;
  }

  // Hide if connected and connectedText is null
  if (isConnected && connectedText === null) {
    return null;
  }

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      type="button"
      className={className}
      disabled={isDisabled}
      onClick={handleClick}
      data-adding={isAdding}
      data-connected={isConnected}
      data-wallet-available={isWalletAvailable}
      {...props}
    >
      {content}
    </Comp>
  );
};

AddNetworkButtonTrigger.displayName = "AddNetworkButton.Trigger";
