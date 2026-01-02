/**
 * @module components/orderbook/orderbook-bids
 * @description Orderbook bids display component
 */

import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useOrderbookContext } from "./orderbook-context.js";
import type { OrderLevel } from "@podnetwork/orderbook";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Orderbook.Bids component.
 * @category Components
 */
export interface OrderbookBidsProps
  extends BaseComponentProps, Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Maximum levels to show */
  readonly limit?: number;
  /** Render function for each level */
  readonly children?: (level: OrderLevel, index: number) => ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Displays bid levels.
 */
export const OrderbookBids = ({
  asChild = false,
  className,
  limit,
  children,
  ref,
  ...props
}: OrderbookBidsProps): React.ReactNode => {
  const { bids } = useOrderbookContext("Orderbook.Bids");

  const displayBids = useMemo(
    () => (limit !== undefined && limit > 0 ? bids.slice(0, limit) : bids),
    [bids, limit]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <Comp ref={ref} className={className} data-side="bid" {...props}>
      {children !== undefined
        ? displayBids.map(async (level, index) => children(level, index))
        : displayBids.map((level, index) => (
            <div key={index} data-level={index}>
              {level.price.toString()} @ {level.volume.toString()}
            </div>
          ))}
    </Comp>
  );
};

OrderbookBids.displayName = "Orderbook.Bids";
