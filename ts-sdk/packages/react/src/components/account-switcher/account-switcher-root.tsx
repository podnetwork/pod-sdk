/**
 * @module components/account-switcher/account-switcher-root
 * @description Root component for AccountSwitcher compound component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useWalletAccounts } from "../../hooks/use-wallet-accounts.js";
import {
  AccountSwitcherContext,
  type AccountSwitcherContextValue,
} from "./account-switcher-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for AccountSwitcher.Root component.
 * @category Components
 */
export interface AccountSwitcherRootProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLDivElement> {
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for the AccountSwitcher compound component.
 *
 * Provides context for child components. Must be used within a
 * `WalletAccountsProvider`.
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
 * </AccountSwitcher.Root>
 * ```
 */
export const AccountSwitcherRoot = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AccountSwitcherRootProps): React.ReactNode => {
  const walletAccounts = useWalletAccounts();

  const contextValue = useMemo<AccountSwitcherContextValue>(
    () => ({
      accounts: walletAccounts.accounts,
      activeAccount: walletAccounts.activeAccount,
      isLoading: walletAccounts.isLoading,
      selectAccount: walletAccounts.selectAccount,
      requestAccounts: walletAccounts.requestAccounts,
    }),
    [
      walletAccounts.accounts,
      walletAccounts.activeAccount,
      walletAccounts.isLoading,
      walletAccounts.selectAccount,
      walletAccounts.requestAccounts,
    ]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <AccountSwitcherContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-loading={walletAccounts.isLoading}
        data-count={walletAccounts.accounts.length}
        {...props}
      >
        {children}
      </Comp>
    </AccountSwitcherContext.Provider>
  );
};

AccountSwitcherRoot.displayName = "AccountSwitcher.Root";
