/**
 * @module components/finalization-status/finalization-status-percentage
 * @description FinalizationStatus percentage display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useFinalizationStatusContext } from "./finalization-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for FinalizationStatus.Percentage component.
 * @category Components
 */
export interface FinalizationStatusPercentageProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Number of decimal places. Default: 0 */
  readonly decimals?: number;
  /** Whether to include the % sign. Default: true */
  readonly showSign?: boolean;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the finalization percentage.
 *
 * @example
 * ```tsx
 * <FinalizationStatus.Percentage />
 * // Renders: "67%"
 * ```
 */
export const FinalizationStatusPercentage = ({
  asChild = false,
  className,
  decimals = 0,
  showSign = true,
  children,
  ref,
  ...props
}: FinalizationStatusPercentageProps): React.ReactNode => {
  const { progress } = useFinalizationStatusContext("FinalizationStatus.Percentage");

  const displayValue = useMemo(() => {
    const value = progress.toFixed(decimals);
    return showSign ? `${value}%` : value;
  }, [progress, decimals, showSign]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-progress={progress} {...props}>
      {children ?? displayValue}
    </Comp>
  );
};

FinalizationStatusPercentage.displayName = "FinalizationStatus.Percentage";
