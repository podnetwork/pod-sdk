/**
 * @module components/transaction/transaction-context
 * @description Context for Transaction compound component
 */

import { createContext, useContext } from "react";
import type { TransactionStatus } from "../../hooks/use-transaction.js";
import type {
  Transaction as TransactionType,
  TransactionReceipt,
  Hash,
  PodError,
} from "../../types.js";

/**
 * Context value for Transaction compound component.
 * @category Components
 */
export interface TransactionContextValue {
  /** Transaction hash */
  readonly hash: Hash;
  /** The transaction object if found */
  readonly transaction: TransactionType | null;
  /** The transaction receipt if available */
  readonly receipt: TransactionReceipt | null;
  /** Transaction status */
  readonly status: TransactionStatus | null;
  /** Pod attestation metadata */
  readonly attestations: TransactionReceipt["podMetadata"] | null;
  /** Whether loading */
  readonly isLoading: boolean;
  /** Error if any */
  readonly error: PodError | null;
}

/**
 * Transaction context.
 * @internal
 */
export const TransactionContext = createContext<TransactionContextValue | null>(null);
TransactionContext.displayName = "TransactionContext";

/**
 * Hook to access Transaction context.
 *
 * @param componentName - Name of component for error message
 * @returns Transaction context value
 * @throws Error if used outside Transaction.Root
 *
 * @internal
 */
export function useTransactionContext(componentName: string): TransactionContextValue {
  const context = useContext(TransactionContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <Transaction.Root>. ` +
        `Wrap your component with <Transaction.Root hash={txHash}>.`
    );
  }
  return context;
}
