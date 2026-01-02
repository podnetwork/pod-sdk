/**
 * Encode module for @podnetwork/abi
 *
 * Provides utilities for encoding function calls and constructor arguments.
 */

// Function encoding
export { encodeFunction, getFunctionSelector, getFunctionSelectors } from "./function.js";

// Constructor encoding
export {
  encodeConstructor,
  hasConstructorParams,
  getConstructorParamCount,
} from "./constructor.js";
