/**
 * @module schemas
 * @description Zod schemas for RPC response validation
 */

// Primitive schemas
export {
  RpcBigIntSchema,
  RpcBigIntOptionalSchema,
  RpcBigIntPositiveSchema,
  RpcBigIntNonNegativeSchema,
} from "./primitives.js";

// Block schemas
export type { Block, BlockTransaction, BlockOrNull } from "./block.js";
export { BlockSchema, BlockOrNullSchema } from "./block.js";

// Transaction schemas
export type { Transaction, TransactionOrNull, TransactionRequest } from "./transaction.js";
export {
  TransactionSchema,
  TransactionOrNullSchema,
  TransactionRequestSchema,
} from "./transaction.js";

// Log schemas
export type { Log, LogFilter } from "./log.js";
export { LogSchema, LogFilterSchema } from "./log.js";

// Pod metadata schemas
export type { AttestedTransaction, ValidatorSignatures, PodMetadata } from "./pod-metadata.js";
export {
  AttestedTransactionSchema,
  ValidatorSignaturesSchema,
  PodMetadataSchema,
} from "./pod-metadata.js";

// Receipt schemas
export type { TransactionReceipt, TransactionReceiptOrNull } from "./receipt.js";
export {
  TransactionReceiptSchema,
  TransactionReceiptOrNullSchema,
  TransactionReceiptHelper,
} from "./receipt.js";

// Committee schemas
export type { Validator, Committee } from "./committee.js";
export { CommitteeSchema } from "./committee.js";

// Vote batch schemas
export type { Vote, VoteBatch } from "./vote-batch.js";
export { VoteBatchSchema, VoteBatchArraySchema } from "./vote-batch.js";
