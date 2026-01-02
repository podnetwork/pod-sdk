/**
 * @module components/orderbook/orderbook-asks
 * @description Orderbook asks display component
 */

import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useOrderbookContext } from "./orderbook-context.js";
import type { OrderLevel } from "@podnetwork/orderbook";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Orderbook.Asks component.
 * @category Components
 */
export interface OrderbookAsksProps
  extends BaseComponentProps, Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Maximum levels to show */
  readonly limit?: number;
  /** Render function for each level */
  readonly children?: (level: OrderLevel, index: number) => ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Displays ask levels.
 */
export const OrderbookAsks = ({
  asChild = false,
  className,
  limit,
  children,
  ref,
  ...props
}: OrderbookAsksProps): React.ReactNode => {
  const { asks } = useOrderbookContext("Orderbook.Asks");

  const displayAsks = useMemo(
    () => (limit !== undefined && limit > 0 ? asks.slice(0, limit) : asks),
    [asks, limit]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <Comp ref={ref} className={className} data-side="ask" {...props}>
      {children !== undefined
        ? displayAsks.map(async (level, index) => children(level, index))
        : displayAsks.map((level, index) => (
            <div key={index} data-level={index}>
              {level.price.toString()} @ {level.volume.toString()}
            </div>
          ))}
    </Comp>
  );
};

OrderbookAsks.displayName = "Orderbook.Asks";
