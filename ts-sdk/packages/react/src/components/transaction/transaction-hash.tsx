/**
 * @module components/transaction/transaction-hash
 * @description Transaction hash display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useTransactionContext } from "./transaction-context.js";
import { truncateHash } from "../../utils/truncate-hash.js";
import type { BaseComponentProps, TruncateMode } from "../../types.js";

/**
 * Props for Transaction.Hash component.
 * @category Components
 */
export interface TransactionHashProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** How to truncate the hash. Default: 'middle' */
  readonly truncate?: TruncateMode;
  /** Number of characters to show at start/end. Default: 6 */
  readonly chars?: number;
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the transaction hash.
 */
export const TransactionHash = ({
  asChild = false,
  className,
  truncate = "middle",
  chars = 6,
  children,
  ref,
  ...props
}: TransactionHashProps): React.ReactNode => {
  const { hash } = useTransactionContext("Transaction.Hash");

  const displayHash = useMemo(() => {
    if (truncate === "none") return hash;
    return truncateHash(hash, { mode: truncate, chars });
  }, [hash, truncate, chars]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-truncate={truncate} title={hash} {...props}>
      {children ?? displayHash}
    </Comp>
  );
};

TransactionHash.displayName = "Transaction.Hash";
