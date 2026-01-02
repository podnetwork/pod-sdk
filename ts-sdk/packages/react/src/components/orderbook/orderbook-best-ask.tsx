/**
 * @module components/orderbook/orderbook-best-ask
 * @description Orderbook best ask display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useOrderbookContext } from "./orderbook-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Orderbook.BestAsk component.
 * @category Components
 */
export interface OrderbookBestAskProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Format function for price display */
  readonly format?: (price: bigint) => string;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the best ask price.
 */
export const OrderbookBestAsk = ({
  asChild = false,
  className,
  format,
  children,
  ref,
  ...props
}: OrderbookBestAskProps): React.ReactNode => {
  const { bestAsk } = useOrderbookContext("Orderbook.BestAsk");

  const displayPrice = useMemo(() => {
    if (bestAsk === null) return "—";
    if (format !== undefined) return format(bestAsk);
    return bestAsk.toString();
  }, [bestAsk, format]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-side="ask" {...props}>
      {children ?? displayPrice}
    </Comp>
  );
};

OrderbookBestAsk.displayName = "Orderbook.BestAsk";
