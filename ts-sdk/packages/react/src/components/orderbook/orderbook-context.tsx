/**
 * @module components/orderbook/orderbook-context
 * @description Orderbook context and hook
 */

import { createContext, useContext } from "react";
import type { OrderBook, OrderLevel } from "@podnetwork/orderbook";
import type { ConnectionState } from "../../hooks/use-orderbook.js";
import type { Hash, PodError } from "../../types.js";

/**
 * Context value for Orderbook compound component.
 * @category Components
 */
export interface OrderbookContextValue {
  /** Orderbook ID */
  readonly orderbookId: Hash;
  /** Full orderbook object */
  readonly orderbook: OrderBook | null;
  /** Bid levels */
  readonly bids: readonly OrderLevel[];
  /** Ask levels */
  readonly asks: readonly OrderLevel[];
  /** Best bid price */
  readonly bestBid: bigint | null;
  /** Best ask price */
  readonly bestAsk: bigint | null;
  /** Spread */
  readonly spread: bigint | null;
  /** Whether loading */
  readonly isLoading: boolean;
  /** Error if any */
  readonly error: PodError | null;
  /** Connection state for subscriptions */
  readonly connectionState: ConnectionState;
  /** Last update timestamp */
  readonly lastUpdate: Date | null;
}

export const OrderbookContext = createContext<OrderbookContextValue | null>(null);
OrderbookContext.displayName = "OrderbookContext";

/**
 * Hook to access Orderbook context.
 *
 * @param componentName - Name of component for error message
 * @returns Orderbook context value
 * @throws Error if used outside Orderbook.Root
 */
export function useOrderbookContext(componentName: string): OrderbookContextValue {
  const context = useContext(OrderbookContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <Orderbook.Root>. ` +
        `Wrap your component with <Orderbook.Root orderbookId={id}>.`
    );
  }
  return context;
}
