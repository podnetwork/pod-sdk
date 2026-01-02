/**
 * Solidity-to-TypeScript type mapping utilities
 *
 * This file provides runtime type name utilities. For compile-time type inference,
 * use ABIType's type utilities which provide full type-level ABI parsing.
 */

/**
 * Maps a Solidity type string to its TypeScript equivalent description
 *
 * Note: Actual type inference is done by ABIType at compile time.
 * This is for documentation and error messages only.
 */
export function getSolidityTypeDescription(solidityType: string): string {
  // Integer types (uint8-uint256, int8-int256)
  if (/^u?int\d*$/.test(solidityType)) {
    return "bigint";
  }

  // Address
  if (solidityType === "address") {
    return "`0x${string}` (42 chars)";
  }

  // Boolean
  if (solidityType === "bool") {
    return "boolean";
  }

  // String
  if (solidityType === "string") {
    return "string";
  }

  // Bytes (fixed and dynamic)
  if (/^bytes\d*$/.test(solidityType)) {
    return "`0x${string}`";
  }

  // Dynamic array
  if (solidityType.endsWith("[]")) {
    const baseType = solidityType.slice(0, -2);
    return `readonly ${getSolidityTypeDescription(baseType)}[]`;
  }

  // Fixed-size array
  const fixedArrayMatch = /^(.+)\[(\d+)\]$/.exec(solidityType);
  if (fixedArrayMatch?.[1] !== undefined && fixedArrayMatch[2] !== undefined) {
    const baseType = fixedArrayMatch[1];
    const size = Number(fixedArrayMatch[2]);
    const baseDesc = getSolidityTypeDescription(baseType);
    return `readonly [${Array(size).fill(baseDesc).join(", ")}]`;
  }

  // Tuple (struct)
  if (solidityType === "tuple") {
    return "{ [name]: Type }";
  }

  // Unknown type
  return "unknown";
}

/**
 * Check if a Solidity type is a value type (not reference type)
 */
export function isValueType(solidityType: string): boolean {
  // Value types: integers, bool, address, bytes1-32
  if (/^u?int\d*$/.test(solidityType)) return true;
  if (solidityType === "bool") return true;
  if (solidityType === "address") return true;
  if (/^bytes([1-9]|[12]\d|3[0-2])$/.test(solidityType)) return true;

  return false;
}

/**
 * Check if a Solidity type is a dynamic type
 */
export function isDynamicType(solidityType: string): boolean {
  // Dynamic types: bytes, string, dynamic arrays, tuples with dynamic members
  if (solidityType === "bytes") return true;
  if (solidityType === "string") return true;
  if (solidityType.endsWith("[]")) return true;

  return false;
}
