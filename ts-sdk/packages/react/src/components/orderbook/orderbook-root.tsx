/**
 * @module components/orderbook/orderbook-root
 * @description Orderbook root component
 */

import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { OrderbookContext, type OrderbookContextValue } from "./orderbook-context.js";
import { useOrderbook, type UseOrderbookOptions } from "../../hooks/use-orderbook.js";
import type { BaseComponentProps, Hash } from "../../types.js";

/**
 * Props for Orderbook.Root component.
 * @category Components
 */
export interface OrderbookRootProps
  extends
    BaseComponentProps,
    Omit<HTMLAttributes<HTMLDivElement>, "children">,
    UseOrderbookOptions {
  /** Orderbook ID to display */
  readonly orderbookId: Hash;
  /** Child components or render function */
  readonly children?: ReactNode | ((context: OrderbookContextValue) => ReactNode);
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for Orderbook compound component.
 *
 * @example
 * ```tsx
 * <Orderbook.Root orderbookId="0x123..." depth={10}>
 *   <Orderbook.Spread />
 *   <div className="grid grid-cols-2">
 *     <Orderbook.Bids />
 *     <Orderbook.Asks />
 *   </div>
 * </Orderbook.Root>
 * ```
 */
export const OrderbookRoot = ({
  orderbookId,
  depth,
  subscribe,
  batchInterval,
  retry,
  enabled,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: OrderbookRootProps): React.ReactNode => {
  // Build options object conditionally to handle exactOptionalPropertyTypes
  const orderbookOptions: UseOrderbookOptions = {
    ...(depth !== undefined && { depth }),
    ...(subscribe !== undefined && { subscribe }),
    ...(batchInterval !== undefined && { batchInterval }),
    ...(retry !== undefined && { retry }),
    ...(enabled !== undefined && { enabled }),
  };

  const {
    orderbook,
    bids,
    asks,
    bestBid,
    bestAsk,
    spread,
    isLoading,
    error,
    connectionState,
    lastUpdate,
  } = useOrderbook(orderbookId, orderbookOptions);

  const contextValue = useMemo<OrderbookContextValue>(
    () => ({
      orderbookId,
      orderbook,
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      isLoading,
      error,
      connectionState,
      lastUpdate,
    }),
    [
      orderbookId,
      orderbook,
      bids,
      asks,
      bestBid,
      bestAsk,
      spread,
      isLoading,
      error,
      connectionState,
      lastUpdate,
    ]
  );

  const Comp = asChild ? Slot : "div";

  const renderedChildren = typeof children === "function" ? children(contextValue) : children;

  return (
    <OrderbookContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-loading={isLoading || undefined}
        data-error={error !== null ? true : undefined}
        data-connected={connectionState === "connected" || undefined}
        {...props}
      >
        {renderedChildren}
      </Comp>
    </OrderbookContext.Provider>
  );
};

OrderbookRoot.displayName = "Orderbook.Root";
