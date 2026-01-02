/**
 * @module components/request-duration
 * @description RequestDuration compound component for displaying transaction timing
 */

import {
  createContext,
  useContext,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { Slot } from "../primitives/slot.js";
import { formatDuration } from "../../utils/format-timestamp.js";
import type { BaseComponentProps } from "../../types.js";

// ============================================================================
// Context
// ============================================================================

/**
 * Context value for RequestDuration compound component.
 * @category Components
 */
export interface RequestDurationContextValue {
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Start timestamp */
  readonly startTime: Date | null;
  /** End timestamp */
  readonly endTime: Date | null;
  /** Whether the request is still in progress */
  readonly isOngoing: boolean;
}

const RequestDurationContext = createContext<RequestDurationContextValue | null>(null);
RequestDurationContext.displayName = "RequestDurationContext";

/**
 * Hook to access RequestDuration context.
 *
 * @param componentName - Name of component for error message
 * @returns RequestDuration context value
 * @throws Error if used outside RequestDuration.Root
 */
export function useRequestDurationContext(componentName: string): RequestDurationContextValue {
  const context = useContext(RequestDurationContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <RequestDuration.Root>. ` +
        `Wrap your component with <RequestDuration.Root durationMs={...}>.`
    );
  }
  return context;
}

// ============================================================================
// Root Component
// ============================================================================

/**
 * Props for RequestDuration.Root component.
 * @category Components
 */
export interface RequestDurationRootProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Duration in milliseconds */
  readonly durationMs: number;
  /** Start timestamp (optional) */
  readonly startTime?: Date;
  /** End timestamp (optional) */
  readonly endTime?: Date;
  /** Whether the request is still in progress */
  readonly isOngoing?: boolean;
  /** Child components */
  readonly children?: ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for RequestDuration compound component.
 *
 * @example
 * ```tsx
 * <RequestDuration.Root durationMs={1500}>
 *   <RequestDuration.Value />
 * </RequestDuration.Root>
 * ```
 */
export const RequestDurationRoot = ({
  durationMs,
  startTime,
  endTime,
  isOngoing = false,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: RequestDurationRootProps): React.ReactNode => {
  const contextValue = useMemo<RequestDurationContextValue>(
    () => ({
      durationMs,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      isOngoing,
    }),
    [durationMs, startTime, endTime, isOngoing]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <RequestDurationContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-duration-ms={durationMs}
        data-ongoing={isOngoing || undefined}
        {...props}
      >
        {children}
      </Comp>
    </RequestDurationContext.Provider>
  );
};

RequestDurationRoot.displayName = "RequestDuration.Root";

// ============================================================================
// Value Component
// ============================================================================

/**
 * Props for RequestDuration.Value component.
 * @category Components
 */
export interface RequestDurationValueProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Whether to use compact format. Default: true */
  readonly compact?: boolean;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the formatted duration value.
 *
 * @example
 * ```tsx
 * <RequestDuration.Value format="auto" />
 * // Renders: "1.5s" or "150ms"
 * ```
 */
export const RequestDurationValue = ({
  asChild = false,
  className,
  compact = true,
  children,
  ref,
  ...props
}: RequestDurationValueProps): React.ReactNode => {
  const { durationMs, isOngoing } = useRequestDurationContext("RequestDuration.Value");

  const displayValue = useMemo(() => {
    if (isOngoing) return "...";
    return formatDuration(durationMs, { compact });
  }, [durationMs, compact, isOngoing]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      className={className}
      data-duration-ms={durationMs}
      data-compact={compact}
      data-ongoing={isOngoing || undefined}
      {...props}
    >
      {children ?? displayValue}
    </Comp>
  );
};

RequestDurationValue.displayName = "RequestDuration.Value";

// ============================================================================
// Breakdown Component
// ============================================================================

/**
 * Props for RequestDuration.Breakdown component.
 * @category Components
 */
export interface RequestDurationBreakdownProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Phases with their durations in ms */
  readonly phases?: readonly { name: string; durationMs: number }[];
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Displays a breakdown of duration phases.
 *
 * @example
 * ```tsx
 * <RequestDuration.Breakdown
 *   phases={[
 *     { name: 'Attestation', durationMs: 100 },
 *     { name: 'Finalization', durationMs: 200 },
 *   ]}
 * />
 * ```
 */
export const RequestDurationBreakdown = ({
  asChild = false,
  className,
  phases = [],
  children,
  ref,
  ...props
}: RequestDurationBreakdownProps): React.ReactNode => {
  const Comp = asChild ? Slot : "div";

  if (phases.length === 0 && children === undefined) {
    return null;
  }

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ??
        phases.map((phase, index) => (
          <div key={index} data-phase={phase.name} data-duration-ms={phase.durationMs}>
            {phase.name}: {formatDuration(phase.durationMs, { compact: true })}
          </div>
        ))}
    </Comp>
  );
};

RequestDurationBreakdown.displayName = "RequestDuration.Breakdown";

// ============================================================================
// Compound Export
// ============================================================================

/**
 * RequestDuration compound component for displaying transaction timing.
 *
 * @example
 * ```tsx
 * <RequestDuration.Root durationMs={1500}>
 *   <span>Transaction completed in </span>
 *   <RequestDuration.Value format="auto" />
 * </RequestDuration.Root>
 * ```
 */
export const RequestDuration = {
  Root: RequestDurationRoot,
  Value: RequestDurationValue,
  Breakdown: RequestDurationBreakdown,
} as const;
