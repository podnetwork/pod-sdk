import { z } from "zod";

/**
 * Base schema for an ABI parameter without recursive components
 */
const baseAbiParameterSchema = z.object({
  name: z.string(),
  type: z.string(),
  internalType: z.string().optional(),
  indexed: z.boolean().optional(),
});

/**
 * Type for an ABI parameter (input/output of functions, events, errors)
 */
export type AbiParameter = z.infer<typeof baseAbiParameterSchema> & {
  components?: AbiParameter[];
};

/**
 * Schema for an ABI parameter (input/output of functions, events, errors)
 * Uses z.lazy() to handle recursive components (for tuple/struct types)
 */
export const AbiParameterSchema: z.ZodType<AbiParameter> = baseAbiParameterSchema.extend({
  components: z.lazy(() => z.array(AbiParameterSchema).optional()),
}) as z.ZodType<AbiParameter>;

/**
 * Schema for a function ABI item
 */
export const AbiFunctionSchema = z.object({
  type: z.literal("function"),
  name: z.string(),
  inputs: z.array(AbiParameterSchema).default([]),
  outputs: z.array(AbiParameterSchema).default([]),
  stateMutability: z.enum(["pure", "view", "nonpayable", "payable"]).default("nonpayable"),
});

/**
 * Schema for an event ABI item
 */
export const AbiEventSchema = z.object({
  type: z.literal("event"),
  name: z.string(),
  inputs: z.array(AbiParameterSchema).default([]),
  anonymous: z.boolean().default(false),
});

/**
 * Schema for an error ABI item
 */
export const AbiErrorSchema = z.object({
  type: z.literal("error"),
  name: z.string(),
  inputs: z.array(AbiParameterSchema).default([]),
});

/**
 * Schema for a constructor ABI item
 */
export const AbiConstructorSchema = z.object({
  type: z.literal("constructor"),
  inputs: z.array(AbiParameterSchema).default([]),
  stateMutability: z.enum(["nonpayable", "payable"]).default("nonpayable"),
});

/**
 * Schema for a fallback ABI item
 */
export const AbiFallbackSchema = z.object({
  type: z.literal("fallback"),
  stateMutability: z.enum(["nonpayable", "payable"]).default("nonpayable"),
});

/**
 * Schema for a receive ABI item
 */
export const AbiReceiveSchema = z.object({
  type: z.literal("receive"),
  stateMutability: z.literal("payable"),
});

/**
 * Discriminated union of all ABI item types
 */
export const AbiItemSchema = z.discriminatedUnion("type", [
  AbiFunctionSchema,
  AbiEventSchema,
  AbiErrorSchema,
  AbiConstructorSchema,
  AbiFallbackSchema,
  AbiReceiveSchema,
]);

export type AbiItem = z.infer<typeof AbiItemSchema>;
export type AbiFunction = z.infer<typeof AbiFunctionSchema>;
export type AbiEvent = z.infer<typeof AbiEventSchema>;
export type AbiError = z.infer<typeof AbiErrorSchema>;
export type AbiConstructor = z.infer<typeof AbiConstructorSchema>;

/**
 * Schema for a complete ABI array
 */
export const AbiSchema = z.array(AbiItemSchema);

export type Abi = z.infer<typeof AbiSchema>;

/**
 * Parse and validate an ABI array
 *
 * @param abi - Raw ABI data to validate
 * @returns Validated ABI array
 * @throws ZodError if validation fails
 */
export function parseAbi(abi: unknown): Abi {
  return AbiSchema.parse(abi);
}

/**
 * Safely parse an ABI, returning null on failure
 *
 * @param abi - Raw ABI data to validate
 * @returns Validated ABI or null
 */
export function safeParseAbi(abi: unknown): Abi | null {
  const result = AbiSchema.safeParse(abi);
  return result.success ? result.data : null;
}
