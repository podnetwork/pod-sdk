/**
 * @module types
 * @description Core types for Pod Network SDK
 */

// Address type and schema
export type { Address, AddressLike } from "./address.js";
export { AddressSchema, AddressBrand } from "./address.js";

// Hash type and schema
export type { Hash, HashLike } from "./hash.js";
export { HashSchema, HashBrand } from "./hash.js";

// Bytes type and schema
export type { Bytes, BytesLike } from "./bytes.js";
export { BytesSchema } from "./bytes.js";

// Block number types and utilities
export type { BlockTag, BlockNumber, BlockNumberLike } from "./block-number.js";
export {
  BlockTagSchema,
  BlockNumberSchema,
  BlockNumberBigIntSchema,
  BLOCK_TAGS,
  normalizeBlockNumber,
} from "./block-number.js";

// BigInt utilities
export {
  BigIntSchema,
  BigIntNonNegativeSchema,
  BigIntPositiveSchema,
  safeToNumber,
  toNumber,
  toHex,
  parseBigInt,
} from "./bigint.js";

// Signer types
export type {
  SignedTransaction,
  Signature,
  SignerBase,
  Signer,
  BroadcastingSigner,
  AnySigner,
} from "./signer.js";
export { isBroadcastingSigner } from "./signer.js";
