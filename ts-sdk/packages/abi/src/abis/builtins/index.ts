/**
 * pod network built-in contract ABIs
 *
 * Pre-bundled ABIs and addresses for pod network's native contracts.
 */

// Addresses
export {
  CLOB_ADDRESS,
  OPTIMISTIC_AUCTION_ADDRESS,
  BRIDGE_ADDRESS,
  NATIVE_TOKEN_ADDRESS,
  POD_ADDRESSES,
  type PodAddresses,
} from "./addresses.js";

// CLOB
export {
  CLOB_ABI,
  Side,
  BidStatus,
  type ClobAbi,
  type Side as SideType,
  type BidStatus as BidStatusType,
} from "./clob.js";

// Optimistic Auction
export { OPTIMISTIC_AUCTION_ABI, type OptimisticAuctionAbi } from "./optimistic-auction.js";

// Bridge
export { BRIDGE_ABI, type BridgeAbi } from "./bridge.js";

// pod ERC-20
export { POD_ERC20_ABI, type PodErc20Abi } from "./pod-erc20.js";
