/**
 * pod network Bridge contract ABI
 *
 * The Bridge contract enables cross-chain deposits from Ethereum to pod network.
 * It supports both native token (ETH/POD) and ERC-20 token deposits.
 */

/**
 * pod network Bridge ABI as const for full type inference
 *
 * Functions:
 * - deposit(token, amount, to) - Deposit tokens to pod network
 * - pause() - Pause the bridge (admin only)
 *
 * Events:
 * - Deposit(id, token, amount, to) - Emitted when a deposit is made
 */
export const BRIDGE_ABI = [
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "pause",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "to", type: "address", indexed: true },
    ],
    anonymous: false,
  },
] as const;

export type BridgeAbi = typeof BRIDGE_ABI;
