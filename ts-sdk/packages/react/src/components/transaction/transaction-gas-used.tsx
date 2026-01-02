/**
 * @module components/transaction/transaction-gas-used
 * @description Transaction gas used display component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useTransactionContext } from "./transaction-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Transaction.GasUsed component.
 * @category Components
 */
export interface TransactionGasUsedProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the gas used by the transaction.
 */
export const TransactionGasUsed = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionGasUsedProps): React.ReactNode => {
  const { receipt } = useTransactionContext("Transaction.GasUsed");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? receipt?.gasUsed.toString() ?? "—"}
    </Comp>
  );
};

TransactionGasUsed.displayName = "Transaction.GasUsed";
