/**
 * @module components/transaction-list
 * @description TransactionList compound component for displaying lists of transactions
 */

import {
  createContext,
  useContext,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { Slot } from "../primitives/slot.js";
import type { BaseComponentProps, Transaction as TransactionData } from "../../types.js";

// ============================================================================
// Context
// ============================================================================

/**
 * Context value for TransactionList compound component.
 * @category Components
 */
export interface TransactionListContextValue {
  /** List of transactions */
  readonly transactions: readonly TransactionData[];
  /** Total count */
  readonly count: number;
  /** Whether loading */
  readonly isLoading: boolean;
  /** Whether there are more transactions to load */
  readonly hasMore: boolean;
}

const TransactionListContext = createContext<TransactionListContextValue | null>(null);
TransactionListContext.displayName = "TransactionListContext";

/**
 * Hook to access TransactionList context.
 *
 * @param componentName - Name of component for error message
 * @returns TransactionList context value
 * @throws Error if used outside TransactionList.Root
 */
export function useTransactionListContext(componentName: string): TransactionListContextValue {
  const context = useContext(TransactionListContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <TransactionList.Root>. ` +
        `Wrap your component with <TransactionList.Root transactions={...}>.`
    );
  }
  return context;
}

// ============================================================================
// Root Component
// ============================================================================

/**
 * Props for TransactionList.Root component.
 * @category Components
 */
export interface TransactionListRootProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** List of transactions to display */
  readonly transactions: readonly TransactionData[];
  /** Whether loading */
  readonly isLoading?: boolean;
  /** Whether there are more transactions available */
  readonly hasMore?: boolean;
  /** Child components */
  readonly children?: ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for TransactionList compound component.
 *
 * @example
 * ```tsx
 * <TransactionList.Root transactions={transactions}>
 *   <TransactionList.Item>
 *     {(tx) => <Transaction.Root hash={tx.hash}>...</Transaction.Root>}
 *   </TransactionList.Item>
 * </TransactionList.Root>
 * ```
 */
export const TransactionListRoot = ({
  transactions,
  isLoading = false,
  hasMore = false,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionListRootProps): React.ReactNode => {
  const contextValue = useMemo<TransactionListContextValue>(
    () => ({
      transactions,
      count: transactions.length,
      isLoading,
      hasMore,
    }),
    [transactions, isLoading, hasMore]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <TransactionListContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-count={transactions.length}
        data-state={isLoading ? "loading" : "success"}
        data-has-more={hasMore || undefined}
        {...props}
      >
        {children}
      </Comp>
    </TransactionListContext.Provider>
  );
};

TransactionListRoot.displayName = "TransactionList.Root";

// ============================================================================
// Item Component
// ============================================================================

/**
 * Props for TransactionList.Item component.
 * @category Components
 */
export interface TransactionListItemProps
  extends BaseComponentProps, Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Render function for each transaction */
  readonly children: (transaction: TransactionData, index: number) => ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Renders each transaction in the list.
 */
export const TransactionListItem = ({
  asChild = false,
  className,
  children: renderFn,
  ref,
  ...props
}: TransactionListItemProps): React.ReactNode => {
  const { transactions } = useTransactionListContext("TransactionList.Item");

  const Comp = asChild ? Slot : "div";

  return (
    <Comp ref={ref} className={className} {...props}>
      {transactions.map(async (tx, index) => renderFn(tx, index))}
    </Comp>
  );
};

TransactionListItem.displayName = "TransactionList.Item";

// ============================================================================
// Count Component
// ============================================================================

/**
 * Props for TransactionList.Count component.
 * @category Components
 */
export interface TransactionListCountProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the count of transactions.
 */
export const TransactionListCount = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionListCountProps): React.ReactNode => {
  const { count } = useTransactionListContext("TransactionList.Count");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-count={count} {...props}>
      {children ?? count.toString()}
    </Comp>
  );
};

TransactionListCount.displayName = "TransactionList.Count";

// ============================================================================
// Empty Component
// ============================================================================

/**
 * Props for TransactionList.Empty component.
 * @category Components
 */
export interface TransactionListEmptyProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Renders only when the list is empty.
 */
export const TransactionListEmpty = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionListEmptyProps): React.ReactNode => {
  const { count, isLoading } = useTransactionListContext("TransactionList.Empty");

  if (count > 0 || isLoading) {
    return null;
  }

  const Comp = asChild ? Slot : "div";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? "No transactions"}
    </Comp>
  );
};

TransactionListEmpty.displayName = "TransactionList.Empty";

// ============================================================================
// Loading Component
// ============================================================================

/**
 * Props for TransactionList.Loading component.
 * @category Components
 */
export interface TransactionListLoadingProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Renders only when loading.
 */
export const TransactionListLoading = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionListLoadingProps): React.ReactNode => {
  const { isLoading } = useTransactionListContext("TransactionList.Loading");

  if (!isLoading) {
    return null;
  }

  const Comp = asChild ? Slot : "div";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? "Loading..."}
    </Comp>
  );
};

TransactionListLoading.displayName = "TransactionList.Loading";

// ============================================================================
// Compound Export
// ============================================================================

/**
 * TransactionList compound component for displaying lists of transactions.
 *
 * @example
 * ```tsx
 * <TransactionList.Root transactions={transactions}>
 *   <TransactionList.Loading>Loading...</TransactionList.Loading>
 *   <TransactionList.Empty>No transactions found</TransactionList.Empty>
 *   <TransactionList.Item>
 *     {(tx, i) => (
 *       <div key={tx.hash}>
 *         {i + 1}. {tx.hash}
 *       </div>
 *     )}
 *   </TransactionList.Item>
 *   <div>Total: <TransactionList.Count /></div>
 * </TransactionList.Root>
 * ```
 */
export const TransactionList = {
  Root: TransactionListRoot,
  Item: TransactionListItem,
  Count: TransactionListCount,
  Empty: TransactionListEmpty,
  Loading: TransactionListLoading,
} as const;
