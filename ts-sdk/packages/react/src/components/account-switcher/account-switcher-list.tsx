/**
 * @module components/account-switcher/account-switcher-list
 * @description List component for AccountSwitcher compound component
 */

import { type HTMLAttributes, type Ref, type ReactNode } from "react";
import { Slot } from "../primitives/slot.js";
import { useAccountSwitcherContext } from "./account-switcher-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for AccountSwitcher.List component.
 * @category Components
 */
export interface AccountSwitcherListProps
  extends BaseComponentProps,
    Omit<HTMLAttributes<HTMLUListElement>, "children"> {
  /**
   * Render function called for each account.
   * Receives the account address as argument.
   */
  readonly children: (account: string, index: number) => ReactNode;
  /** Ref to the list element */
  readonly ref?: Ref<HTMLUListElement>;
}

/**
 * List component that renders account items.
 *
 * Uses a render prop pattern to let you customize how each account is displayed.
 *
 * @example
 * ```tsx
 * <AccountSwitcher.Root>
 *   <AccountSwitcher.List>
 *     {(account) => (
 *       <AccountSwitcher.Item key={account} address={account}>
 *         <Address.Root value={account}>
 *           <Address.Truncated />
 *         </Address.Root>
 *         <AccountSwitcher.ActiveIndicator />
 *       </AccountSwitcher.Item>
 *     )}
 *   </AccountSwitcher.List>
 * </AccountSwitcher.Root>
 * ```
 */
export const AccountSwitcherList = ({
  children,
  asChild = false,
  className,
  ref,
  ...props
}: AccountSwitcherListProps): React.ReactNode => {
  const { accounts, isLoading } = useAccountSwitcherContext("AccountSwitcher.List");

  const Comp = asChild ? Slot : "ul";

  if (isLoading) {
    return (
      <Comp ref={ref} className={className} data-loading="true" {...props}>
        {/* Empty during loading */}
      </Comp>
    );
  }

  return (
    <Comp ref={ref} className={className} role="listbox" {...props}>
      {accounts.map((account, index) => children(account, index))}
    </Comp>
  );
};

AccountSwitcherList.displayName = "AccountSwitcher.List";
