/**
 * @module components/transaction/transaction-to
 * @description Transaction recipient address display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useTransactionContext } from "./transaction-context.js";
import { truncateHash } from "../../utils/truncate-hash.js";
import type { BaseComponentProps, TruncateMode } from "../../types.js";

/**
 * Props for Transaction.To component.
 * @category Components
 */
export interface TransactionToProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** How to truncate the address. Default: 'middle' */
  readonly truncate?: TruncateMode;
  /** Number of characters to show at start/end. Default: 6 */
  readonly chars?: number;
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the recipient (to) address.
 */
export const TransactionTo = ({
  asChild = false,
  className,
  truncate = "middle",
  chars = 6,
  children,
  ref,
  ...props
}: TransactionToProps): React.ReactNode => {
  const { transaction } = useTransactionContext("Transaction.To");

  const displayAddress = useMemo(() => {
    if (transaction?.to === undefined) return null;
    if (truncate === "none") return transaction.to;
    return truncateHash(transaction.to, { mode: truncate, chars });
  }, [transaction?.to, truncate, chars]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      className={className}
      data-truncate={truncate}
      title={transaction?.to ?? undefined}
      {...props}
    >
      {children ?? displayAddress ?? "Contract Creation"}
    </Comp>
  );
};

TransactionTo.displayName = "Transaction.To";
