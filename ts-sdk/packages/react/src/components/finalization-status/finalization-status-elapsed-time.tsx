/**
 * @module components/finalization-status/finalization-status-elapsed-time
 * @description FinalizationStatus elapsed time display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useFinalizationStatusContext } from "./finalization-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for FinalizationStatus.ElapsedTime component.
 * @category Components
 */
export interface FinalizationStatusElapsedTimeProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Format: "ms", "s", or "auto". Default: "auto" */
  readonly format?: "ms" | "s" | "auto";
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the elapsed time since transaction submission.
 *
 * @example
 * ```tsx
 * <FinalizationStatus.ElapsedTime format="auto" />
 * // Renders: "1.5s" or "1500ms"
 * ```
 */
export const FinalizationStatusElapsedTime = ({
  asChild = false,
  className,
  format = "auto",
  children,
  ref,
  ...props
}: FinalizationStatusElapsedTimeProps): React.ReactNode => {
  const { elapsedTime } = useFinalizationStatusContext("FinalizationStatus.ElapsedTime");

  const displayValue = useMemo(() => {
    if (elapsedTime === null) return "—";

    if (format === "ms") return `${String(elapsedTime)}ms`;
    if (format === "s") return `${(elapsedTime / 1000).toFixed(2)}s`;

    // auto format
    if (elapsedTime < 1000) return `${String(elapsedTime)}ms`;
    if (elapsedTime < 60000) return `${(elapsedTime / 1000).toFixed(1)}s`;
    const mins = Math.floor(elapsedTime / 60000);
    const secs = Math.floor((elapsedTime % 60000) / 1000);
    return `${String(mins)}m ${String(secs)}s`;
  }, [elapsedTime, format]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-elapsed-ms={elapsedTime ?? undefined} {...props}>
      {children ?? displayValue}
    </Comp>
  );
};

FinalizationStatusElapsedTime.displayName = "FinalizationStatus.ElapsedTime";
