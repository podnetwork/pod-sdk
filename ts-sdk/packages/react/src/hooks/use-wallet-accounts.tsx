/**
 * @module hooks/use-wallet-accounts
 * @description Hook for managing multiple wallet accounts
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { isBrowser } from "@podnetwork/core";
import type { EIP1193Provider } from "@podnetwork/wallet-browser";

import { useWallet } from "./use-wallet.js";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for the WalletAccountsProvider.
 */
export interface WalletAccountsProviderProps {
  /** React children */
  children: ReactNode;
  /**
   * Storage key for persisting active account selection.
   * @default 'pod-active-account'
   */
  storageKey?: string;
}

/**
 * Result returned by the useWalletAccounts hook.
 */
export interface UseWalletAccountsResult {
  /** All accounts the wallet has granted access to */
  accounts: string[];
  /** The currently selected active account (app-level selection) */
  activeAccount: string | null;
  /** Whether accounts are being loaded */
  isLoading: boolean;
  /** Select a different account (app-level, no wallet popup) */
  selectAccount: (address: string) => void;
  /** Open wallet to request/manage account permissions */
  requestAccounts: () => Promise<void>;
  /** Manually refresh the accounts list */
  refreshAccounts: () => Promise<void>;
}

// =============================================================================
// Context
// =============================================================================

const WalletAccountsContext = createContext<UseWalletAccountsResult | null>(null);

/**
 * Error thrown when useWalletAccounts is used outside WalletAccountsProvider.
 */
export class WalletAccountsProviderError extends Error {
  constructor() {
    super(
      "useWalletAccounts must be used within a WalletAccountsProvider. " +
        "Wrap your component tree with <WalletAccountsProvider>."
    );
    this.name = "WalletAccountsProviderError";
  }
}

// =============================================================================
// Provider
// =============================================================================

/**
 * Provider for wallet accounts state.
 *
 * This provider manages the list of accounts the wallet has granted access to
 * and allows the app to select which account is "active" without triggering
 * wallet popups.
 *
 * **Key Concepts:**
 * - **accounts**: All addresses the wallet has granted permission to use
 * - **activeAccount**: The app's selected account (stored in localStorage)
 *
 * The provider listens for `accountsChanged` events to stay in sync with
 * the wallet's permission state.
 *
 * @example
 * ```tsx
 * import { WalletAccountsProvider } from '@podnetwork/react';
 *
 * function App() {
 *   return (
 *     <PodProvider network={POD_CHRONOS_DEV_NETWORK}>
 *       <WalletProvider>
 *         <WalletAccountsProvider>
 *           <MyApp />
 *         </WalletAccountsProvider>
 *       </WalletProvider>
 *     </PodProvider>
 *   );
 * }
 * ```
 */
export function WalletAccountsProvider({
  children,
  storageKey = "pod-active-account",
}: WalletAccountsProviderProps): ReactNode {
  const { status } = useWallet();
  const [accounts, setAccounts] = useState<string[]>([]);
  const [activeAccount, setActiveAccount] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load persisted active account on mount
  useEffect(() => {
    if (!isBrowser()) return;
    const stored = localStorage.getItem(storageKey);
    if (stored != null) {
      setActiveAccount(stored);
    }
  }, [storageKey]);

  // Fetch accounts from wallet
  const fetchAccounts = useCallback(async (): Promise<void> => {
    const ethereum = getEthereumProvider();
    if (ethereum == null) {
      setAccounts([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await ethereum.request({
        method: "eth_accounts",
        params: [],
      });
      const accountList = (result as string[]) || [];
      setAccounts(accountList);

      // If current active account is no longer in the list, select first available
      const firstAccount = accountList[0];
      if (firstAccount != null) {
        setActiveAccount((current): string | null => {
          const currentLower = current?.toLowerCase();
          const isCurrentValid = accountList.some(
            (acc) => acc.toLowerCase() === currentLower
          );
          if (!isCurrentValid) {
            if (isBrowser()) {
              localStorage.setItem(storageKey, firstAccount);
            }
            return firstAccount;
          }
          return current;
        });
      }
    } catch (error) {
      console.error("[useWalletAccounts] Failed to fetch accounts:", error);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [storageKey]);

  // Fetch accounts when wallet connects
  useEffect(() => {
    if (status === "connected") {
      fetchAccounts();
    } else {
      // Clear state when disconnected
      setAccounts([]);
      setActiveAccount(null);
      if (isBrowser()) {
        localStorage.removeItem(storageKey);
      }
    }
  }, [status, fetchAccounts, storageKey]);

  // Listen for account changes from wallet
  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (ethereum?.on == null) {
      return;
    }

    const handleAccountsChanged = (newAccounts: unknown): void => {
      const accountList = (newAccounts as string[]) || [];
      setAccounts(accountList);

      // If current active account is no longer permitted, switch to first available
      const firstAccount = accountList[0];
      if (firstAccount != null) {
        setActiveAccount((current): string | null => {
          const currentLower = current?.toLowerCase();
          const isCurrentValid = accountList.some(
            (acc) => acc.toLowerCase() === currentLower
          );
          if (!isCurrentValid) {
            if (isBrowser()) {
              localStorage.setItem(storageKey, firstAccount);
            }
            return firstAccount;
          }
          return current;
        });
      } else {
        setActiveAccount(null);
        if (isBrowser()) {
          localStorage.removeItem(storageKey);
        }
      }
    };

    ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [storageKey]);

  // Select an account (app-level, no wallet popup)
  const selectAccount = useCallback(
    (address: string): void => {
      // Verify the account is in the permitted list
      const normalizedAddress = address.toLowerCase();
      const isValid = accounts.some(
        (acc) => acc.toLowerCase() === normalizedAddress
      );
      if (!isValid) {
        console.warn(
          "[useWalletAccounts] Cannot select account not in permitted list:",
          address
        );
        return;
      }

      setActiveAccount(address);
      if (isBrowser()) {
        localStorage.setItem(storageKey, address);
      }
    },
    [accounts, storageKey]
  );

  // Open wallet to request/manage account permissions
  const requestAccounts = useCallback(async (): Promise<void> => {
    const ethereum = getEthereumProvider();
    if (ethereum == null) {
      return;
    }

    try {
      // Request permissions to trigger wallet's account selection UI
      await ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
      // Accounts will update via the accountsChanged event listener
    } catch (error) {
      console.error("[useWalletAccounts] Failed to request accounts:", error);
    }
  }, []);

  const value = useMemo(
    () => ({
      accounts,
      activeAccount,
      isLoading,
      selectAccount,
      requestAccounts,
      refreshAccounts: fetchAccounts,
    }),
    [accounts, activeAccount, isLoading, selectAccount, requestAccounts, fetchAccounts]
  );

  return (
    <WalletAccountsContext.Provider value={value}>
      {children}
    </WalletAccountsContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access wallet accounts state and actions.
 *
 * Must be used within a `WalletAccountsProvider`.
 *
 * @returns Wallet accounts state and actions
 * @throws {WalletAccountsProviderError} If used outside of WalletAccountsProvider
 *
 * @example
 * ```tsx
 * function AccountSelector() {
 *   const {
 *     accounts,
 *     activeAccount,
 *     selectAccount,
 *     requestAccounts,
 *   } = useWalletAccounts();
 *
 *   return (
 *     <div>
 *       <h3>Select Account</h3>
 *       <ul>
 *         {accounts.map((account) => (
 *           <li key={account}>
 *             <button
 *               onClick={() => selectAccount(account)}
 *               data-active={account === activeAccount}
 *             >
 *               {account}
 *             </button>
 *           </li>
 *         ))}
 *       </ul>
 *       <button onClick={requestAccounts}>
 *         Manage Accounts in Wallet
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWalletAccounts(): UseWalletAccountsResult {
  const context = useContext(WalletAccountsContext);

  if (context === null) {
    throw new WalletAccountsProviderError();
  }

  return context;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the Ethereum provider from the window object.
 */
function getEthereumProvider(): EIP1193Provider | undefined {
  if (!isBrowser()) {
    return undefined;
  }

  const win = globalThis as typeof globalThis & {
    ethereum?: EIP1193Provider;
  };

  return win.ethereum;
}
