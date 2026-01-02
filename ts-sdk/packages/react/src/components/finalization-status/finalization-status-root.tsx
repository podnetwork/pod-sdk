/**
 * @module components/finalization-status/finalization-status-root
 * @description FinalizationStatus root component
 */

import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import {
  FinalizationStatusContext,
  type FinalizationStatusContextValue,
} from "./finalization-status-context.js";
import { useFinalizationStatus } from "../../hooks/use-finalization-status.js";
import type { BaseComponentProps, Hash } from "../../types.js";

/**
 * Props for FinalizationStatus.Root component.
 * @category Components
 */
export interface FinalizationStatusRootProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Transaction hash to track */
  readonly hash: Hash;
  /** Whether to enable tracking. Default: true */
  readonly enabled?: boolean;
  /** Polling interval in ms. Default: 1000 */
  readonly pollingInterval?: number;
  /** Quorum threshold (0-1). Default: 0.67 */
  readonly quorumThreshold?: number;
  /** Child components */
  readonly children?: ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for FinalizationStatus compound component.
 *
 * @example
 * ```tsx
 * <FinalizationStatus.Root hash="0x123...">
 *   <FinalizationStatus.Progress />
 *   <FinalizationStatus.Percentage />
 *   <FinalizationStatus.Badge />
 * </FinalizationStatus.Root>
 * ```
 */
export const FinalizationStatusRoot = ({
  hash,
  enabled = true,
  pollingInterval = 1000,
  quorumThreshold = 0.67,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: FinalizationStatusRootProps): React.ReactNode => {
  const {
    stage,
    attestationCount,
    totalValidators,
    progress,
    isFinalized,
    isLoading,
    error,
    elapsedTime,
  } = useFinalizationStatus(hash, { enabled, pollingInterval, quorumThreshold });

  const contextValue = useMemo<FinalizationStatusContextValue>(
    () => ({
      stage,
      attestationCount,
      totalValidators,
      progress,
      isFinalized,
      isLoading,
      error,
      elapsedTime,
    }),
    [stage, attestationCount, totalValidators, progress, isFinalized, isLoading, error, elapsedTime]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <FinalizationStatusContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-stage={stage}
        data-finalized={isFinalized || undefined}
        data-progress={progress}
        data-state={isLoading ? "loading" : error !== null ? "error" : "success"}
        {...props}
      >
        {children}
      </Comp>
    </FinalizationStatusContext.Provider>
  );
};

FinalizationStatusRoot.displayName = "FinalizationStatus.Root";
