/**
 * @module schemas/primitives
 * @description Shared Zod schemas for RPC response parsing
 */

import { z } from "zod";
import { parseBigInt } from "../types/bigint.js";

/**
 * Schema for parsing bigint from hex or decimal string.
 * Used for all numeric fields in RPC responses.
 */
export const RpcBigIntSchema = z.union([z.string(), z.bigint()]).transform((v): bigint => {
  if (typeof v === "bigint") return v;
  return parseBigInt(v);
});

/**
 * Schema for optional bigint fields that may be null.
 */
export const RpcBigIntOptionalSchema = z
  .union([z.string(), z.bigint(), z.null()])
  .transform((v): bigint | undefined => {
    if (v === null) return undefined;
    if (typeof v === "bigint") return v;
    return parseBigInt(v);
  });

/**
 * Schema for bigint fields that must be positive (> 0).
 */
export const RpcBigIntPositiveSchema = z
  .union([z.string(), z.bigint()])
  .transform((v): bigint => {
    if (typeof v === "bigint") return v;
    return parseBigInt(v);
  })
  .refine((v) => v > 0n, { message: "Value must be positive" });

/**
 * Schema for bigint fields that must be non-negative (>= 0).
 */
export const RpcBigIntNonNegativeSchema = z
  .union([z.string(), z.bigint()])
  .transform((v): bigint => {
    if (typeof v === "bigint") return v;
    return parseBigInt(v);
  })
  .refine((v) => v >= 0n, { message: "Value must be non-negative" });
