/**
 * @module components/transaction/transaction-status
 * @description Transaction status display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useTransactionContext } from "./transaction-context.js";
import type { TransactionStatus as TransactionStatusType } from "../../hooks/use-transaction.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Transaction.Status component.
 * @category Components
 */
export interface TransactionStatusProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Custom labels for status values */
  readonly labels?: Partial<Record<TransactionStatusType, string>>;
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

const DEFAULT_STATUS_LABELS: Record<TransactionStatusType, string> = {
  pending: "Pending",
  attested: "Attested",
  finalized: "Finalized",
  failed: "Failed",
};

/**
 * Displays the transaction status.
 */
export const TransactionStatusComponent = ({
  asChild = false,
  className,
  labels,
  children,
  ref,
  ...props
}: TransactionStatusProps): React.ReactNode => {
  const { status, isLoading } = useTransactionContext("Transaction.Status");

  const statusLabels = useMemo(() => ({ ...DEFAULT_STATUS_LABELS, ...labels }), [labels]);

  const displayStatus = useMemo(() => {
    if (isLoading) return "Loading...";
    if (status === null) return "Unknown";
    return statusLabels[status];
  }, [status, isLoading, statusLabels]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      role="status"
      aria-live="polite"
      aria-busy={isLoading || undefined}
      className={className}
      data-status={status ?? undefined}
      data-loading={isLoading || undefined}
      {...props}
    >
      {children ?? displayStatus}
    </Comp>
  );
};

TransactionStatusComponent.displayName = "Transaction.Status";
