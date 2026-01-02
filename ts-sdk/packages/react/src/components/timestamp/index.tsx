/**
 * @module components/timestamp
 * @description Timestamp compound component for displaying dates and times
 */

import { createContext, useContext, useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { formatTimestamp, relativeTime } from "../../utils/format-timestamp.js";
import type { BaseComponentProps } from "../../types.js";

// ============================================================================
// Context
// ============================================================================

interface TimestampContextValue {
  readonly value: Date;
  readonly format: "relative" | "absolute" | "both";
  readonly locale: string | undefined;
  readonly timezone: string | undefined;
  readonly isoString: string;
}

const TimestampContext = createContext<TimestampContextValue | null>(null);
TimestampContext.displayName = "TimestampContext";

function useTimestampContext(componentName: string): TimestampContextValue {
  const context = useContext(TimestampContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <Timestamp.Root>. ` +
        `Wrap your component with <Timestamp.Root value={timestamp}>.`
    );
  }
  return context;
}

// ============================================================================
// Root Component
// ============================================================================

/**
 * Props for Timestamp.Root component.
 * @category Components
 */
export interface TimestampRootProps extends BaseComponentProps, HTMLAttributes<HTMLTimeElement> {
  /** Unix timestamp (seconds or ms) or Date object */
  readonly value: number | bigint | Date;
  /** Display format. Default: 'relative' */
  readonly format?: "relative" | "absolute" | "both";
  /** Locale for formatting */
  readonly locale?: string;
  /** Timezone for absolute display */
  readonly timezone?: string;
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLTimeElement>;
}

/**
 * Root component for Timestamp compound component.
 *
 * @example
 * ```tsx
 * <Timestamp.Root value={Date.now() - 60000}>
 *   <Timestamp.Relative />
 * </Timestamp.Root>
 * // Renders: 1 minute ago
 * ```
 */
export const TimestampRoot = ({
  value,
  format = "relative",
  locale,
  timezone,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TimestampRootProps): React.ReactNode => {
  const contextValue = useMemo<TimestampContextValue>(() => {
    let date: Date;
    if (value instanceof Date) {
      date = value;
    } else {
      const ts = typeof value === "bigint" ? Number(value) : value;
      // Assume seconds if less than a reasonable millisecond timestamp
      const ms = ts < 1e12 ? ts * 1000 : ts;
      date = new Date(ms);
    }

    return {
      value: date,
      format,
      locale,
      timezone,
      isoString: date.toISOString(),
    };
  }, [value, format, locale, timezone]);

  const Comp = asChild ? Slot : "time";

  return (
    <TimestampContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        dateTime={contextValue.isoString}
        data-format={format}
        {...props}
      >
        {children ?? <TimestampRelative />}
      </Comp>
    </TimestampContext.Provider>
  );
};

TimestampRoot.displayName = "Timestamp.Root";

// ============================================================================
// Relative Component
// ============================================================================

/**
 * Props for Timestamp.Relative component.
 * @category Components
 */
export interface TimestampRelativeProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays a relative time string (e.g., "5 minutes ago").
 */
export const TimestampRelative = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TimestampRelativeProps): React.ReactNode => {
  const { value, locale } = useTimestampContext("Timestamp.Relative");

  const relativeStr = useMemo(() => relativeTime(value, new Date(), locale), [value, locale]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? relativeStr}
    </Comp>
  );
};

TimestampRelative.displayName = "Timestamp.Relative";

// ============================================================================
// Absolute Component
// ============================================================================

/**
 * Props for Timestamp.Absolute component.
 * @category Components
 */
export interface TimestampAbsoluteProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Date style. Default: 'short' */
  readonly dateStyle?: "full" | "long" | "medium" | "short";
  /** Time style. Default: 'short' */
  readonly timeStyle?: "full" | "long" | "medium" | "short";
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays an absolute date/time string.
 */
export const TimestampAbsolute = ({
  asChild = false,
  className,
  children,
  dateStyle = "short",
  timeStyle = "short",
  ref,
  ...props
}: TimestampAbsoluteProps): React.ReactNode => {
  const { value, locale, timezone } = useTimestampContext("Timestamp.Absolute");

  const absoluteStr = useMemo(
    () =>
      formatTimestamp(value, {
        format: "absolute",
        dateStyle,
        timeStyle,
        ...(locale !== undefined && { locale }),
        ...(timezone !== undefined && { timezone }),
      }),
    [value, locale, timezone, dateStyle, timeStyle]
  );

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? absoluteStr}
    </Comp>
  );
};

TimestampAbsolute.displayName = "Timestamp.Absolute";

// ============================================================================
// Compound Export
// ============================================================================

/**
 * Timestamp compound component.
 *
 * @example
 * ```tsx
 * <Timestamp.Root value={Date.now()}>
 *   <Timestamp.Relative /> // "just now"
 * </Timestamp.Root>
 *
 * <Timestamp.Root value={1703289600}>
 *   <Timestamp.Absolute dateStyle="long" />
 * </Timestamp.Root>
 * // "December 22, 2023"
 * ```
 */
export const Timestamp = {
  Root: TimestampRoot,
  Relative: TimestampRelative,
  Absolute: TimestampAbsolute,
} as const;
