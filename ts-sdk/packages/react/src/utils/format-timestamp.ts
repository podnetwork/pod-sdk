/**
 * @module utils/format-timestamp
 * @description Utilities for formatting timestamps
 */

/**
 * Options for formatTimestamp utility.
 * @category Utilities
 */
export interface FormatTimestampOptions {
  /** Format mode. Default: 'relative' */
  readonly format?: "relative" | "absolute";
  /** Locale for formatting. Default: user's locale */
  readonly locale?: string;
  /** Timezone for absolute display. Default: user's timezone */
  readonly timezone?: string;
  /** Date style for absolute format */
  readonly dateStyle?: "full" | "long" | "medium" | "short";
  /** Time style for absolute format */
  readonly timeStyle?: "full" | "long" | "medium" | "short";
  /** Reference time for relative formatting. Default: now */
  readonly relativeTo?: Date | number;
}

/**
 * Formats a timestamp for display.
 *
 * @param timestamp - Unix timestamp in seconds or milliseconds, or Date
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatTimestamp(1703289600);
 * // => '2 hours ago' (relative)
 *
 * formatTimestamp(1703289600, { format: 'absolute' });
 * // => '12/22/2023, 4:00 PM'
 *
 * formatTimestamp(1703289600, {
 *   format: 'absolute',
 *   dateStyle: 'long',
 *   timeStyle: 'short'
 * });
 * // => 'December 22, 2023 at 4:00 PM'
 * ```
 */
export function formatTimestamp(
  timestamp: number | bigint | Date,
  options: FormatTimestampOptions = {}
): string {
  const {
    format = "relative",
    locale,
    timezone,
    dateStyle,
    timeStyle,
    relativeTo = new Date(),
  } = options;

  // Convert to Date object
  let date: Date;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    const ts = typeof timestamp === "bigint" ? Number(timestamp) : timestamp;
    // Assume seconds if less than a reasonable millisecond timestamp
    const ms = ts < 1e12 ? ts * 1000 : ts;
    date = new Date(ms);
  }

  if (format === "absolute") {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: dateStyle ?? "short",
      timeStyle: timeStyle ?? "short",
      timeZone: timezone,
    }).format(date);
  }

  // Relative formatting
  const referenceDate = relativeTo instanceof Date ? relativeTo : new Date(relativeTo);
  return relativeTime(date, referenceDate, locale);
}

/**
 * Calculates relative time string.
 *
 * @param date - Date to format
 * @param relativeTo - Reference date. Default: now
 * @param locale - Locale for formatting
 * @returns Relative time string
 *
 * @example
 * ```typescript
 * relativeTime(new Date(Date.now() - 60000));
 * // => '1 minute ago'
 *
 * relativeTime(new Date(Date.now() + 3600000));
 * // => 'in 1 hour'
 * ```
 */
export function relativeTime(date: Date, relativeTo: Date = new Date(), locale?: string): string {
  const diffMs = date.getTime() - relativeTo.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  const absDiffSeconds = Math.abs(diffSeconds);

  // Determine the appropriate unit and value
  let value: number;
  let unit: Intl.RelativeTimeFormatUnit;

  if (absDiffSeconds < 60) {
    value = diffSeconds;
    unit = "second";
  } else if (absDiffSeconds < 3600) {
    value = Math.round(diffSeconds / 60);
    unit = "minute";
  } else if (absDiffSeconds < 86400) {
    value = Math.round(diffSeconds / 3600);
    unit = "hour";
  } else if (absDiffSeconds < 604800) {
    value = Math.round(diffSeconds / 86400);
    unit = "day";
  } else if (absDiffSeconds < 2592000) {
    value = Math.round(diffSeconds / 604800);
    unit = "week";
  } else if (absDiffSeconds < 31536000) {
    value = Math.round(diffSeconds / 2592000);
    unit = "month";
  } else {
    value = Math.round(diffSeconds / 31536000);
    unit = "year";
  }

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  return formatter.format(value, unit);
}

/**
 * Options for formatDuration utility.
 * @category Utilities
 */
export interface FormatDurationOptions {
  /** Decimal precision for sub-millisecond values. Default: 2 */
  readonly precision?: number;
  /** Include unit label. Default: true */
  readonly includeUnit?: boolean;
  /** Use compact format (e.g., '1.5s' vs '1.5 seconds'). Default: true */
  readonly compact?: boolean;
}

/**
 * Formats a duration for display.
 *
 * @param milliseconds - Duration in milliseconds
 * @param options - Formatting options
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatDuration(1500);
 * // => '1.5s'
 *
 * formatDuration(0.03);
 * // => '0.03ms'
 *
 * formatDuration(65000);
 * // => '1m 5s'
 *
 * formatDuration(1500, { compact: false });
 * // => '1.5 seconds'
 *
 * formatDuration(1500, { includeUnit: false });
 * // => '1.5'
 * ```
 */
export function formatDuration(milliseconds: number, options: FormatDurationOptions = {}): string {
  const { precision = 2, includeUnit = true, compact = true } = options;

  // Handle sub-millisecond values
  if (milliseconds < 1) {
    const value = milliseconds.toFixed(precision);
    if (!includeUnit) return value;
    return compact ? `${value}ms` : `${value} milliseconds`;
  }

  // Handle milliseconds (< 1 second)
  if (milliseconds < 1000) {
    const value = milliseconds.toFixed(precision);
    if (!includeUnit) return value;
    return compact ? `${value}ms` : `${value} milliseconds`;
  }

  // Handle seconds (< 1 minute)
  if (milliseconds < 60000) {
    const seconds = milliseconds / 1000;
    const value = seconds.toFixed(precision);
    if (!includeUnit) return value;
    return compact ? `${value}s` : `${value} seconds`;
  }

  // Handle minutes and seconds
  const minutes = Math.floor(milliseconds / 60000);
  const remainingSeconds = Math.round((milliseconds % 60000) / 1000);

  if (compact) {
    if (remainingSeconds === 0) {
      return includeUnit ? `${String(minutes)}m` : String(minutes);
    }
    return includeUnit
      ? `${String(minutes)}m ${String(remainingSeconds)}s`
      : `${String(minutes)}:${String(remainingSeconds)}`;
  }

  if (remainingSeconds === 0) {
    return includeUnit ? `${String(minutes)} minute${minutes === 1 ? "" : "s"}` : String(minutes);
  }

  return includeUnit
    ? `${String(minutes)} minute${minutes === 1 ? "" : "s"} ${String(remainingSeconds)} second${remainingSeconds === 1 ? "" : "s"}`
    : `${String(minutes)}:${String(remainingSeconds)}`;
}
