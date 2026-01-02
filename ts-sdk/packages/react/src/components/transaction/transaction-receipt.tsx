/**
 * @module components/transaction/transaction-receipt
 * @description Transaction receipt container component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useTransactionContext } from "./transaction-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Transaction.Receipt component.
 * @category Components
 */
export interface TransactionReceiptProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Ref to the element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Container for receipt details. Renders children only if receipt is available.
 */
export const TransactionReceiptComponent = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TransactionReceiptProps): React.ReactNode => {
  const { receipt } = useTransactionContext("Transaction.Receipt");

  if (receipt === null) {
    return null;
  }

  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      className={className}
      data-status={receipt.status ? "success" : "reverted"}
      {...props}
    >
      {children}
    </Comp>
  );
};

TransactionReceiptComponent.displayName = "Transaction.Receipt";
