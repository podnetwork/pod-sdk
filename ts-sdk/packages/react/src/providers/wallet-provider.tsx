/**
 * @module providers/wallet-provider
 * @description React context provider for wallet state management
 */

import { createContext, useReducer, type ReactNode } from "react";

import type { WalletState, WalletAction, WalletContextValue } from "../types.js";

/**
 * Initial wallet state.
 */
export const INITIAL_STATE: WalletState = {
  status: "disconnected",
  signer: null,
  address: null,
  walletType: null,
  error: null,
};

/**
 * Wallet context.
 * @internal
 */
export const WalletContext = createContext<WalletContextValue | null>(null);
WalletContext.displayName = "PodWalletContext";

/**
 * Wallet state reducer.
 */
function walletReducer(state: WalletState, action: WalletAction): WalletState {
  switch (action.type) {
    case "CONNECT_START":
      return {
        status: "connecting",
        signer: null,
        address: null,
        walletType: action.walletType,
        error: null,
      };

    case "CONNECT_SUCCESS":
      return {
        status: "connected",
        signer: action.signer,
        address: action.address,
        walletType: action.walletType,
        error: null,
      };

    case "CONNECT_ERROR":
      return {
        status: "error",
        signer: null,
        address: null,
        walletType: state.walletType,
        error: action.error,
      };

    case "DISCONNECT":
      return INITIAL_STATE;

    default:
      return state;
  }
}

/**
 * Props for WalletProvider.
 */
export interface WalletProviderProps {
  children: ReactNode;
}

/**
 * Provider component for wallet state management.
 *
 * Wrap your application with this provider to enable wallet hooks.
 *
 * @example
 * ```tsx
 * import { WalletProvider } from '@podnetwork/react';
 *
 * function App() {
 *   return (
 *     <WalletProvider>
 *       <YourApp />
 *     </WalletProvider>
 *   );
 * }
 * ```
 */
export function WalletProvider({ children }: WalletProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(walletReducer, INITIAL_STATE);

  return <WalletContext.Provider value={{ state, dispatch }}>{children}</WalletContext.Provider>;
}
