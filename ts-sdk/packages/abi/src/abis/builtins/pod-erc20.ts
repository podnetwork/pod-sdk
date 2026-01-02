/**
 * pod network test ERC-20 ABI (simplified)
 *
 * A simplified ERC-20 interface used for pod network test tokens.
 *
 * @see FR-048
 */

/**
 * pod network test ERC-20 ABI as const for full type inference
 *
 * Functions:
 * - transfer(to, amount)
 * - getBalance() view
 */
export const POD_ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getBalance",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export type PodErc20Abi = typeof POD_ERC20_ABI;
