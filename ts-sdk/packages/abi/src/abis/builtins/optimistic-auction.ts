/**
 * pod network Optimistic Auction contract ABI
 *
 * @see FR-047
 */

/**
 * pod network Optimistic Auction ABI as const for full type inference
 *
 * Functions:
 * - submitBid(uint256 auction_id, uint128 deadline, uint256 value, bytes data)
 *
 * Events:
 * - BidSubmitted(uint256 indexed auction_id, address indexed bidder, uint128 indexed deadline, uint256 value, bytes data)
 */
export const OPTIMISTIC_AUCTION_ABI = [
  {
    type: "function",
    name: "submitBid",
    inputs: [
      { name: "auction_id", type: "uint256" },
      { name: "deadline", type: "uint128" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "BidSubmitted",
    inputs: [
      { name: "auction_id", type: "uint256", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "deadline", type: "uint128", indexed: true },
      { name: "value", type: "uint256", indexed: false },
      { name: "data", type: "bytes", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export type OptimisticAuctionAbi = typeof OPTIMISTIC_AUCTION_ABI;
