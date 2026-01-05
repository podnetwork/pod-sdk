/**
 * @module components/account-switcher
 * @description AccountSwitcher compound component for managing wallet accounts
 *
 * The AccountSwitcher component provides a flexible way to display and switch
 * between multiple wallet accounts without wallet popups.
 *
 * **Important:** Must be used within a `WalletAccountsProvider`.
 *
 * @example
 * ```tsx
 * import { AccountSwitcher, Address, Avatar } from '@podnetwork/react';
 *
 * function AccountList() {
 *   return (
 *     <AccountSwitcher.Root>
 *       <AccountSwitcher.List>
 *         {(account) => (
 *           <AccountSwitcher.Item key={account} address={account}>
 *             <Avatar.Root name={account} size={24}>
 *               <Avatar.Image />
 *             </Avatar.Root>
 *             <Address.Root value={account}>
 *               <Address.Truncated />
 *             </Address.Root>
 *             <AccountSwitcher.ActiveIndicator>
 *               <CheckIcon />
 *             </AccountSwitcher.ActiveIndicator>
 *           </AccountSwitcher.Item>
 *         )}
 *       </AccountSwitcher.List>
 *       <AccountSwitcher.ManageButton />
 *     </AccountSwitcher.Root>
 *   );
 * }
 * ```
 */

import { AccountSwitcherRoot } from "./account-switcher-root.js";
import { AccountSwitcherList } from "./account-switcher-list.js";
import { AccountSwitcherItem, useAccountItemContext } from "./account-switcher-item.js";
import { AccountSwitcherActiveIndicator } from "./account-switcher-active-indicator.js";
import { AccountSwitcherManageButton } from "./account-switcher-manage-button.js";

export type { AccountSwitcherContextValue } from "./account-switcher-context.js";
export { useAccountSwitcherContext } from "./account-switcher-context.js";
export type { AccountSwitcherRootProps } from "./account-switcher-root.js";
export type { AccountSwitcherListProps } from "./account-switcher-list.js";
export type { AccountSwitcherItemProps } from "./account-switcher-item.js";
export type { AccountSwitcherActiveIndicatorProps } from "./account-switcher-active-indicator.js";
export type { AccountSwitcherManageButtonProps } from "./account-switcher-manage-button.js";
export { useAccountItemContext };

/**
 * AccountSwitcher compound component.
 *
 * Displays and manages wallet account selection.
 * Must be used within a `WalletAccountsProvider`.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <AccountSwitcher.Root>
 *   <AccountSwitcher.List>
 *     {(account) => (
 *       <AccountSwitcher.Item key={account} address={account}>
 *         {account}
 *       </AccountSwitcher.Item>
 *     )}
 *   </AccountSwitcher.List>
 * </AccountSwitcher.Root>
 *
 * // With manage button
 * <AccountSwitcher.Root>
 *   <AccountSwitcher.List>
 *     {(account) => (
 *       <AccountSwitcher.Item key={account} address={account}>
 *         {account}
 *         <AccountSwitcher.ActiveIndicator />
 *       </AccountSwitcher.Item>
 *     )}
 *   </AccountSwitcher.List>
 *   <AccountSwitcher.ManageButton />
 * </AccountSwitcher.Root>
 * ```
 */
export const AccountSwitcher = {
  Root: AccountSwitcherRoot,
  List: AccountSwitcherList,
  Item: AccountSwitcherItem,
  ActiveIndicator: AccountSwitcherActiveIndicator,
  ManageButton: AccountSwitcherManageButton,
} as const;

export {
  AccountSwitcherRoot,
  AccountSwitcherList,
  AccountSwitcherItem,
  AccountSwitcherActiveIndicator,
  AccountSwitcherManageButton,
};
