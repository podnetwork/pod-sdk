/**
 * @module components/finalization-status/finalization-status-badge
 * @description FinalizationStatus badge component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useFinalizationStatusContext } from "./finalization-status-context.js";
import type { FinalizationStage } from "../../hooks/use-finalization-status.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for FinalizationStatus.Badge component.
 * @category Components
 */
export interface FinalizationStatusBadgeProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Custom labels for each stage */
  readonly labels?: Partial<Record<FinalizationStage, string>>;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

const DEFAULT_STAGE_LABELS: Record<FinalizationStage, string> = {
  pending: "Pending",
  attesting: "Attesting",
  finalizing: "Finalizing",
  finalized: "Finalized",
  failed: "Failed",
};

/**
 * Displays a badge showing the current finalization stage.
 *
 * @example
 * ```tsx
 * <FinalizationStatus.Badge />
 * // Renders: "Attesting" or "Finalized"
 * ```
 */
export const FinalizationStatusBadge = ({
  asChild = false,
  className,
  labels,
  children,
  ref,
  ...props
}: FinalizationStatusBadgeProps): React.ReactNode => {
  const { stage, isLoading } = useFinalizationStatusContext("FinalizationStatus.Badge");

  const stageLabels = useMemo(() => ({ ...DEFAULT_STAGE_LABELS, ...labels }), [labels]);

  const displayLabel = useMemo(() => {
    if (isLoading) return "Loading...";
    return stageLabels[stage];
  }, [stage, isLoading, stageLabels]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      className={className}
      data-stage={stage}
      data-loading={isLoading || undefined}
      {...props}
    >
      {children ?? displayLabel}
    </Comp>
  );
};

FinalizationStatusBadge.displayName = "FinalizationStatus.Badge";
