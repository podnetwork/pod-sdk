/**
 * @module components/transaction/transaction-value
 * @description Transaction value display component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useTransactionContext } from "./transaction-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Transaction.Value component.
 * @category Components
 */
export interface TransactionValueProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the transaction value.
 */
export const TransactionValue = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionValueProps): React.ReactNode => {
  const { transaction } = useTransactionContext("Transaction.Value");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? transaction?.value.toString() ?? "0"}
    </Comp>
  );
};

TransactionValue.displayName = "Transaction.Value";
