/**
 * @module button-group
 * @description Button group container for wallet-ui
 */

import type { HTMLAttributes } from "react";
import { cn } from "./utils.js";

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Orientation of the button group */
  readonly orientation?: "horizontal" | "vertical";
}

/**
 * A container that groups related buttons together with consistent styling.
 * Buttons are visually joined by removing interior borders/radius.
 *
 * @example
 * ```tsx
 * <ButtonGroup>
 *   <Button variant="outline">Left</Button>
 *   <Button variant="outline">Right</Button>
 * </ButtonGroup>
 * ```
 */
export function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: ButtonGroupProps) {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orientation}
      className={cn(
        "inline-flex",
        orientation === "horizontal"
          ? [
              "flex-row",
              "[&>*:not(:first-child):not(:last-child)]:rounded-none",
              "[&>*:first-child:not(:last-child)]:rounded-r-none",
              "[&>*:last-child:not(:first-child)]:rounded-l-none",
              "[&>*:not(:first-child)]:-ml-px",
              "[&>*:focus-visible]:z-10",
            ]
          : [
              "flex-col",
              "[&>*:not(:first-child):not(:last-child)]:rounded-none",
              "[&>*:first-child:not(:last-child)]:rounded-b-none",
              "[&>*:last-child:not(:first-child)]:rounded-t-none",
              "[&>*:not(:first-child)]:-mt-px",
              "[&>*:focus-visible]:z-10",
            ],
        className
      )}
      {...props}
    />
  );
}

ButtonGroup.displayName = "ButtonGroup";
