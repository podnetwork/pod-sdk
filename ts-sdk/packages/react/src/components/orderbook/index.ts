/**
 * @module components/orderbook
 * @description Orderbook compound component for displaying orderbook data
 *
 * @example
 * ```tsx
 * import { Orderbook } from '@podnetwork/react';
 *
 * function OrderbookDisplay({ orderbookId }) {
 *   return (
 *     <Orderbook.Root orderbookId={orderbookId} depth={10}>
 *       <div className="header">
 *         <Orderbook.BestBid />
 *         <Orderbook.Spread />
 *         <Orderbook.BestAsk />
 *       </div>
 *       <div className="grid grid-cols-2">
 *         <Orderbook.Bids limit={5}>
 *           {(level, i) => (
 *             <div key={i}>{level.price.toString()}</div>
 *           )}
 *         </Orderbook.Bids>
 *         <Orderbook.Asks limit={5}>
 *           {(level, i) => (
 *             <div key={i}>{level.price.toString()}</div>
 *           )}
 *         </Orderbook.Asks>
 *       </div>
 *     </Orderbook.Root>
 *   );
 * }
 * ```
 */

import { OrderbookRoot } from "./orderbook-root.js";
import { OrderbookBids } from "./orderbook-bids.js";
import { OrderbookAsks } from "./orderbook-asks.js";
import { OrderbookSpread } from "./orderbook-spread.js";
import { OrderbookBestBid } from "./orderbook-best-bid.js";
import { OrderbookBestAsk } from "./orderbook-best-ask.js";
import { OrderbookDepth } from "./orderbook-depth.js";

export { useOrderbookContext } from "./orderbook-context.js";
export type { OrderbookContextValue } from "./orderbook-context.js";
export type { OrderbookRootProps } from "./orderbook-root.js";
export type { OrderbookBidsProps } from "./orderbook-bids.js";
export type { OrderbookAsksProps } from "./orderbook-asks.js";
export type { OrderbookSpreadProps } from "./orderbook-spread.js";
export type { OrderbookBestBidProps } from "./orderbook-best-bid.js";
export type { OrderbookBestAskProps } from "./orderbook-best-ask.js";
export type { OrderbookDepthProps } from "./orderbook-depth.js";

/**
 * Orderbook compound component.
 *
 * @example
 * ```tsx
 * <Orderbook.Root orderbookId="0x123..." depth={10}>
 *   <div className="header">
 *     <Orderbook.BestBid />
 *     <Orderbook.Spread />
 *     <Orderbook.BestAsk />
 *   </div>
 *   <div className="grid grid-cols-2">
 *     <Orderbook.Bids limit={5}>
 *       {(level, i) => (
 *         <div key={i}>{level.price.toString()}</div>
 *       )}
 *     </Orderbook.Bids>
 *     <Orderbook.Asks limit={5}>
 *       {(level, i) => (
 *         <div key={i}>{level.price.toString()}</div>
 *       )}
 *     </Orderbook.Asks>
 *   </div>
 * </Orderbook.Root>
 * ```
 */
export const Orderbook = {
  Root: OrderbookRoot,
  Bids: OrderbookBids,
  Asks: OrderbookAsks,
  Spread: OrderbookSpread,
  BestBid: OrderbookBestBid,
  BestAsk: OrderbookBestAsk,
  Depth: OrderbookDepth,
} as const;

export {
  OrderbookRoot,
  OrderbookBids,
  OrderbookAsks,
  OrderbookSpread,
  OrderbookBestBid,
  OrderbookBestAsk,
  OrderbookDepth,
};
