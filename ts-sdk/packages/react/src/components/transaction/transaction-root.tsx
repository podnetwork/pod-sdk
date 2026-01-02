/**
 * @module components/transaction/transaction-root
 * @description Root component for Transaction compound component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { TransactionContext, type TransactionContextValue } from "./transaction-context.js";
import { useTransaction, type TransactionStatus } from "../../hooks/use-transaction.js";
import type {
  BaseComponentProps,
  Transaction as TransactionType,
  TransactionReceipt,
  Hash,
} from "../../types.js";

/**
 * Props for Transaction.Root component.
 * @category Components
 */
export interface TransactionRootProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Transaction hash to track */
  readonly hash: Hash;
  /** Pre-fetched transaction (skip fetching) */
  readonly transaction?: TransactionType;
  /** Pre-fetched receipt (skip fetching) */
  readonly receipt?: TransactionReceipt;
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for Transaction compound component.
 *
 * @example
 * ```tsx
 * <Transaction.Root hash="0x123...">
 *   <Transaction.Hash truncate="middle" />
 *   <Transaction.Status />
 * </Transaction.Root>
 * ```
 */
export const TransactionRoot = ({
  hash,
  transaction: providedTransaction,
  receipt: providedReceipt,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionRootProps): React.ReactNode => {
  // Only fetch if not provided
  const shouldFetch = providedTransaction === undefined;
  const {
    transaction: fetchedTransaction,
    receipt: fetchedReceipt,
    status,
    attestations,
    isLoading,
    error,
  } = useTransaction(hash, { enabled: shouldFetch });

  const transaction = providedTransaction ?? fetchedTransaction;
  const receipt = providedReceipt ?? fetchedReceipt;

  // Derive status from provided receipt if available
  const derivedStatus = useMemo<TransactionStatus | null>(() => {
    if (providedReceipt !== undefined) {
      if (!providedReceipt.status) return "failed";
      const sigCount = providedReceipt.podMetadata.signatureCount;
      if (sigCount === 0) return "pending";
      if (sigCount >= 2) return "finalized";
      return "attested";
    }
    return status;
  }, [providedReceipt, status]);

  const contextValue = useMemo<TransactionContextValue>(
    () => ({
      hash,
      transaction,
      receipt,
      status: derivedStatus,
      attestations: receipt?.podMetadata ?? attestations,
      isLoading: shouldFetch ? isLoading : false,
      error: shouldFetch ? error : null,
    }),
    [hash, transaction, receipt, derivedStatus, attestations, isLoading, error, shouldFetch]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <TransactionContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-status={derivedStatus ?? undefined}
        data-state={isLoading ? "loading" : error !== null ? "error" : "success"}
        {...props}
      >
        {children}
      </Comp>
    </TransactionContext.Provider>
  );
};

TransactionRoot.displayName = "Transaction.Root";
