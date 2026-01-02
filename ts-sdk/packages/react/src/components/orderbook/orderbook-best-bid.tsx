/**
 * @module components/orderbook/orderbook-best-bid
 * @description Orderbook best bid display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useOrderbookContext } from "./orderbook-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Orderbook.BestBid component.
 * @category Components
 */
export interface OrderbookBestBidProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Format function for price display */
  readonly format?: (price: bigint) => string;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the best bid price.
 */
export const OrderbookBestBid = ({
  asChild = false,
  className,
  format,
  children,
  ref,
  ...props
}: OrderbookBestBidProps): React.ReactNode => {
  const { bestBid } = useOrderbookContext("Orderbook.BestBid");

  const displayPrice = useMemo(() => {
    if (bestBid === null) return "—";
    if (format !== undefined) return format(bestBid);
    return bestBid.toString();
  }, [bestBid, format]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-side="bid" {...props}>
      {children ?? displayPrice}
    </Comp>
  );
};

OrderbookBestBid.displayName = "Orderbook.BestBid";
