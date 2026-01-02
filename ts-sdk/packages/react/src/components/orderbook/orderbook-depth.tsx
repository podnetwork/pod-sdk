/**
 * @module components/orderbook/orderbook-depth
 * @description Orderbook depth display component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useOrderbookContext } from "./orderbook-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Orderbook.Depth component.
 * @category Components
 */
export interface OrderbookDepthProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the orderbook depth (number of levels).
 */
export const OrderbookDepth = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: OrderbookDepthProps): React.ReactNode => {
  const { bids, asks } = useOrderbookContext("Orderbook.Depth");

  const depthStr = `${String(bids.length)} / ${String(asks.length)}`;

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? depthStr}
    </Comp>
  );
};

OrderbookDepth.displayName = "Orderbook.Depth";
