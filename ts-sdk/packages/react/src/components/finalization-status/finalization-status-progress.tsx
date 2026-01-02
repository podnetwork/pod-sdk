/**
 * @module components/finalization-status/finalization-status-progress
 * @description FinalizationStatus progress bar component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useFinalizationStatusContext } from "./finalization-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for FinalizationStatus.Progress component.
 * @category Components
 */
export interface FinalizationStatusProgressProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Maximum width of the progress bar. Default: "100%" */
  readonly maxWidth?: string;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Displays a progress bar showing finalization progress.
 *
 * @example
 * ```tsx
 * <FinalizationStatus.Progress style={{ height: "8px", background: "#e0e0e0" }} />
 * ```
 */
export const FinalizationStatusProgress = ({
  asChild = false,
  className,
  maxWidth = "100%",
  style,
  children,
  ref,
  ...props
}: FinalizationStatusProgressProps): React.ReactNode => {
  const { progress, stage, isFinalized } = useFinalizationStatusContext(
    "FinalizationStatus.Progress"
  );

  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      ref={ref}
      className={className}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      data-stage={stage}
      data-finalized={isFinalized || undefined}
      style={{
        ...style,
        width: `${String(Math.min(progress, 100))}%`,
        maxWidth,
      }}
      {...props}
    >
      {children}
    </Comp>
  );
};

FinalizationStatusProgress.displayName = "FinalizationStatus.Progress";
