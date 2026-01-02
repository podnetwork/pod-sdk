/**
 * pod network CLOB (Central Limit Order Book) contract ABI
 *
 * @see FR-046
 */

/**
 * CLOB order side enum
 */
export const Side = {
  Buy: 0,
  Sell: 1,
} as const;

export type Side = (typeof Side)[keyof typeof Side];

/**
 * CLOB bid status enum
 */
export const BidStatus = {
  Pending: 0,
  Active: 1,
  Filled: 2,
  Expired: 3,
} as const;

export type BidStatus = (typeof BidStatus)[keyof typeof BidStatus];

/**
 * pod network CLOB ABI as const for full type inference
 *
 * Functions:
 * - submitBid(side, volume, price, clob_id, start_ts, ttl)
 * - deposit(token, amount)
 * - withdraw(token, amount)
 * - submitSolution(clob_id, start_ts, bids)
 * - getBalance(token) view
 * - getBids(clob_id, tx_hashes) view
 * - createOrderBook(base, quote, auction_interval, solver_pk)
 */
export const CLOB_ABI = [
  {
    type: "function",
    name: "submitBid",
    inputs: [
      { name: "side", type: "uint8" },
      { name: "volume", type: "uint256" },
      { name: "price", type: "uint256" },
      { name: "clob_id", type: "bytes32" },
      { name: "start_ts", type: "uint128" },
      { name: "ttl", type: "uint128" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deposit",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitSolution",
    inputs: [
      { name: "clob_id", type: "bytes32" },
      { name: "start_ts", type: "uint128" },
      { name: "bids", type: "bytes32[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getBalance",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBids",
    inputs: [
      { name: "clob_id", type: "bytes32" },
      { name: "tx_hashes", type: "bytes32[]" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "tx_hash", type: "bytes32" },
          { name: "side", type: "uint8" },
          { name: "status", type: "uint16" },
          { name: "remaining_base_amount", type: "uint256" },
          { name: "price", type: "uint256" },
          { name: "start_ts", type: "uint128" },
          { name: "end_ts", type: "uint128" },
          { name: "filled_base_amount", type: "uint256" },
          { name: "filled_quote_amount", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createOrderBook",
    inputs: [
      { name: "base", type: "address" },
      { name: "quote", type: "address" },
      { name: "auction_interval", type: "uint128" },
      { name: "solver_pk", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "BidSubmitted",
    inputs: [
      { name: "clob_id", type: "bytes32", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "tx_hash", type: "bytes32", indexed: true },
      { name: "side", type: "uint8", indexed: false },
      { name: "volume", type: "uint256", indexed: false },
      { name: "price", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Deposit",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdraw",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export type ClobAbi = typeof CLOB_ABI;
