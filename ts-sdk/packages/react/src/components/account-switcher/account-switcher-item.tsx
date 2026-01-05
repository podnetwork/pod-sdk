/**
 * @module components/account-switcher/account-switcher-item
 * @description Item component for AccountSwitcher compound component
 */

import {
  type HTMLAttributes,
  type Ref,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from "react";
import { Slot } from "../primitives/slot.js";
import { useAccountSwitcherContext } from "./account-switcher-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Context for individual account item.
 * @internal
 */
interface AccountItemContextValue {
  address: string;
  isActive: boolean;
}

const AccountItemContext = createContext<AccountItemContextValue | null>(null);

/**
 * Hook to access the AccountItem context.
 * @internal
 */
export function useAccountItemContext(componentName: string): AccountItemContextValue {
  const context = useContext(AccountItemContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <AccountSwitcher.Item>. ` +
        `Wrap your component with <AccountSwitcher.Item address={address}>.`
    );
  }
  return context;
}

/**
 * Props for AccountSwitcher.Item component.
 * @category Components
 */
export interface AccountSwitcherItemProps
  extends BaseComponentProps,
    Omit<HTMLAttributes<HTMLLIElement>, "onClick"> {
  /** The account address this item represents */
  readonly address: string;
  /** Child content */
  readonly children?: React.ReactNode;
  /** Ref to the list item element */
  readonly ref?: Ref<HTMLLIElement>;
}

/**
 * Item component representing a single account.
 *
 * Clicking the item selects that account. Uses data attributes for styling:
 * - `data-active="true"` when this is the active account
 *
 * @example
 * ```tsx
 * <AccountSwitcher.List>
 *   {(account) => (
 *     <AccountSwitcher.Item
 *       key={account}
 *       address={account}
 *       className="hover:bg-gray-100"
 *     >
 *       <Address.Root value={account}>
 *         <Address.Truncated />
 *       </Address.Root>
 *       <AccountSwitcher.ActiveIndicator>
 *         <CheckIcon />
 *       </AccountSwitcher.ActiveIndicator>
 *     </AccountSwitcher.Item>
 *   )}
 * </AccountSwitcher.List>
 * ```
 */
export const AccountSwitcherItem = ({
  address,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AccountSwitcherItemProps): React.ReactNode => {
  const { activeAccount, selectAccount } = useAccountSwitcherContext("AccountSwitcher.Item");

  const isActive = activeAccount?.toLowerCase() === address.toLowerCase();

  const handleClick = useCallback(() => {
    selectAccount(address);
  }, [address, selectAccount]);

  const itemContext = useMemo<AccountItemContextValue>(
    () => ({ address, isActive }),
    [address, isActive]
  );

  const Comp = asChild ? Slot : "li";

  return (
    <AccountItemContext.Provider value={itemContext}>
      <Comp
        ref={ref}
        className={className}
        role="option"
        aria-selected={isActive}
        onClick={handleClick}
        data-active={isActive}
        {...props}
      >
        {children}
      </Comp>
    </AccountItemContext.Provider>
  );
};

AccountSwitcherItem.displayName = "AccountSwitcher.Item";
