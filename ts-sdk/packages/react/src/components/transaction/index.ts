/**
 * @module components/transaction
 * @description Transaction compound component for displaying transaction details
 *
 * @example
 * ```tsx
 * import { Transaction } from '@podnetwork/react';
 *
 * function TransactionDetails({ hash }) {
 *   return (
 *     <Transaction.Root hash={hash}>
 *       <Transaction.Hash truncate="middle" />
 *       <Transaction.Status />
 *       <Transaction.Receipt>
 *         <Transaction.GasUsed />
 *         <Transaction.BlockNumber />
 *       </Transaction.Receipt>
 *     </Transaction.Root>
 *   );
 * }
 * ```
 */

import { TransactionRoot } from "./transaction-root.js";
import { TransactionHash } from "./transaction-hash.js";
import { TransactionStatusComponent } from "./transaction-status.js";
import { TransactionReceiptComponent } from "./transaction-receipt.js";
import { TransactionValue } from "./transaction-value.js";
import { TransactionFrom } from "./transaction-from.js";
import { TransactionTo } from "./transaction-to.js";
import { TransactionGasUsed } from "./transaction-gas-used.js";
import { TransactionBlockNumber } from "./transaction-block-number.js";

export { useTransactionContext } from "./transaction-context.js";
export type { TransactionContextValue } from "./transaction-context.js";
export type { TransactionRootProps } from "./transaction-root.js";
export type { TransactionHashProps } from "./transaction-hash.js";
export type { TransactionStatusProps } from "./transaction-status.js";
export type { TransactionReceiptProps } from "./transaction-receipt.js";
export type { TransactionValueProps } from "./transaction-value.js";
export type { TransactionFromProps } from "./transaction-from.js";
export type { TransactionToProps } from "./transaction-to.js";
export type { TransactionGasUsedProps } from "./transaction-gas-used.js";
export type { TransactionBlockNumberProps } from "./transaction-block-number.js";

/**
 * Transaction compound component.
 *
 * @example
 * ```tsx
 * <Transaction.Root hash="0x123...">
 *   <Transaction.Hash truncate="middle" />
 *   <Transaction.Status />
 *   <Transaction.Receipt>
 *     <Transaction.GasUsed />
 *     <Transaction.BlockNumber />
 *   </Transaction.Receipt>
 * </Transaction.Root>
 * ```
 */
export const Transaction = {
  Root: TransactionRoot,
  Hash: TransactionHash,
  Status: TransactionStatusComponent,
  Receipt: TransactionReceiptComponent,
  Value: TransactionValue,
  From: TransactionFrom,
  To: TransactionTo,
  GasUsed: TransactionGasUsed,
  BlockNumber: TransactionBlockNumber,
} as const;

export {
  TransactionRoot,
  TransactionHash,
  TransactionStatusComponent,
  TransactionReceiptComponent,
  TransactionValue,
  TransactionFrom,
  TransactionTo,
  TransactionGasUsed,
  TransactionBlockNumber,
};
