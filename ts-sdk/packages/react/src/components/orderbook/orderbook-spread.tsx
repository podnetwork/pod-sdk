/**
 * @module components/orderbook/orderbook-spread
 * @description Orderbook spread display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useOrderbookContext } from "./orderbook-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Orderbook.Spread component.
 * @category Components
 */
export interface OrderbookSpreadProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Format function for spread display */
  readonly format?: (spread: bigint) => string;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the bid-ask spread.
 */
export const OrderbookSpread = ({
  asChild = false,
  className,
  format,
  children,
  ref,
  ...props
}: OrderbookSpreadProps): React.ReactNode => {
  const { spread } = useOrderbookContext("Orderbook.Spread");

  const displaySpread = useMemo(() => {
    if (spread === null) return "—";
    if (format !== undefined) return format(spread);
    return spread.toString();
  }, [spread, format]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-has-spread={spread !== null || undefined} {...props}>
      {children ?? displaySpread}
    </Comp>
  );
};

OrderbookSpread.displayName = "Orderbook.Spread";
