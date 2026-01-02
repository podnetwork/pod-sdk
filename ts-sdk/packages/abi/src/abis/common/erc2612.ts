/**
 * ERC-2612 Permit Extension (Gasless Approvals) ABI
 *
 * Extends ERC-20 with permit functionality for gasless approvals.
 *
 * @see EIP-2612: https://eips.ethereum.org/EIPS/eip-2612
 * @see FR-045
 */

/**
 * ERC-2612 Permit extension ABI as const for full type inference
 *
 * This ABI contains only the permit-specific functions.
 * Use alongside ERC20_ABI for a complete ERC-20 with permit implementation.
 */
export const ERC2612_ABI = [
  {
    type: "function",
    name: "permit",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "nonces",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "DOMAIN_SEPARATOR",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
] as const;

export type ERC2612Abi = typeof ERC2612_ABI;
