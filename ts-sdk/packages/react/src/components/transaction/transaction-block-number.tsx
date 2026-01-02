/**
 * @module components/transaction/transaction-block-number
 * @description Transaction block number display component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useTransactionContext } from "./transaction-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Transaction.BlockNumber component.
 * @category Components
 */
export interface TransactionBlockNumberProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the block number the transaction was included in.
 */
export const TransactionBlockNumber = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionBlockNumberProps): React.ReactNode => {
  const { receipt } = useTransactionContext("Transaction.BlockNumber");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? receipt?.blockNumber?.toString() ?? "—"}
    </Comp>
  );
};

TransactionBlockNumber.displayName = "Transaction.BlockNumber";
