/**
 * @module components/transaction/transaction-from
 * @description Transaction sender address display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useTransactionContext } from "./transaction-context.js";
import { truncateHash } from "../../utils/truncate-hash.js";
import type { BaseComponentProps, TruncateMode } from "../../types.js";

/**
 * Props for Transaction.From component.
 * @category Components
 */
export interface TransactionFromProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** How to truncate the address. Default: 'middle' */
  readonly truncate?: TruncateMode;
  /** Number of characters to show at start/end. Default: 6 */
  readonly chars?: number;
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the sender (from) address.
 */
export const TransactionFrom = ({
  asChild = false,
  className,
  truncate = "middle",
  chars = 6,
  children,
  ref,
  ...props
}: TransactionFromProps): React.ReactNode => {
  const { transaction } = useTransactionContext("Transaction.From");

  const displayAddress = useMemo(() => {
    if (transaction?.from === undefined) return null;
    if (truncate === "none") return transaction.from;
    return truncateHash(transaction.from, { mode: truncate, chars });
  }, [transaction?.from, truncate, chars]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      className={className}
      data-truncate={truncate}
      title={transaction?.from}
      {...props}
    >
      {children ?? displayAddress ?? "Unknown"}
    </Comp>
  );
};

TransactionFrom.displayName = "Transaction.From";
