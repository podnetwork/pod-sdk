/**
 * @module components/account-switcher/account-switcher-context
 * @description Context for AccountSwitcher compound component
 */

import { createContext, useContext } from "react";

/**
 * Context value shared within AccountSwitcher compound component.
 * @category Components
 */
export interface AccountSwitcherContextValue {
  /** All accounts the wallet has granted access to */
  readonly accounts: string[];
  /** The currently selected active account */
  readonly activeAccount: string | null;
  /** Whether accounts are being loaded */
  readonly isLoading: boolean;
  /** Select a different account */
  readonly selectAccount: (address: string) => void;
  /** Open wallet to request/manage account permissions */
  readonly requestAccounts: () => Promise<void>;
}

/**
 * AccountSwitcher context.
 * @internal
 */
export const AccountSwitcherContext = createContext<AccountSwitcherContextValue | null>(null);
AccountSwitcherContext.displayName = "AccountSwitcherContext";

/**
 * Hook to access the AccountSwitcher context.
 *
 * @param componentName - Name of the component for error message
 * @throws Error if used outside AccountSwitcher.Root
 *
 * @internal
 */
export function useAccountSwitcherContext(componentName: string): AccountSwitcherContextValue {
  const context = useContext(AccountSwitcherContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <AccountSwitcher.Root>. ` +
        `Wrap your component with <AccountSwitcher.Root>.`
    );
  }
  return context;
}
