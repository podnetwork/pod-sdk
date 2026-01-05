/**
 * @module components/account-switcher/account-switcher-manage-button
 * @description Manage button component for AccountSwitcher compound component
 */

import { type ButtonHTMLAttributes, type Ref, useState, useCallback } from "react";
import { Slot } from "../primitives/slot.js";
import { useAccountSwitcherContext } from "./account-switcher-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for AccountSwitcher.ManageButton component.
 * @category Components
 */
export interface AccountSwitcherManageButtonProps
  extends BaseComponentProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Child content */
  readonly children?: React.ReactNode;
  /** Ref to the button element */
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * Button component to open wallet's account management UI.
 *
 * Opens the browser wallet (e.g., MetaMask) to let users manage
 * which accounts are connected to the app.
 *
 * @example
 * ```tsx
 * <AccountSwitcher.Root>
 *   <AccountSwitcher.List>
 *     {(account) => (
 *       <AccountSwitcher.Item key={account} address={account}>
 *         {account}
 *       </AccountSwitcher.Item>
 *     )}
 *   </AccountSwitcher.List>
 *   <AccountSwitcher.ManageButton className="text-sm text-blue-500">
 *     Manage Accounts in Wallet
 *   </AccountSwitcher.ManageButton>
 * </AccountSwitcher.Root>
 * ```
 */
export const AccountSwitcherManageButton = ({
  asChild = false,
  className,
  children,
  disabled,
  ref,
  ...props
}: AccountSwitcherManageButtonProps): React.ReactNode => {
  const { requestAccounts, isLoading } = useAccountSwitcherContext(
    "AccountSwitcher.ManageButton"
  );
  const [isRequesting, setIsRequesting] = useState(false);

  const handleClick = useCallback(async () => {
    if (isRequesting) return;

    setIsRequesting(true);
    try {
      await requestAccounts();
    } finally {
      setIsRequesting(false);
    }
  }, [isRequesting, requestAccounts]);

  const Comp = asChild ? Slot : "button";
  const isDisabled = disabled ?? isRequesting ?? isLoading;

  return (
    <Comp
      ref={ref}
      type="button"
      className={className}
      disabled={isDisabled}
      onClick={handleClick}
      aria-busy={isRequesting}
      data-requesting={isRequesting}
      {...props}
    >
      {children ?? "Manage Accounts in Wallet"}
    </Comp>
  );
};

AccountSwitcherManageButton.displayName = "AccountSwitcher.ManageButton";
