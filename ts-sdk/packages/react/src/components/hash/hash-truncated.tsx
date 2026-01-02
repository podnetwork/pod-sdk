/**
 * @module components/hash/hash-truncated
 * @description Truncated hash display component with accessibility support
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useHashContext } from "./hash-context.js";
import { truncateHash } from "../../utils/truncate-hash.js";
import { srOnlyStyles } from "../../utils/styles.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Hash.Truncated component.
 * @category Components
 */
export interface HashTruncatedProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the truncated version of the hash with accessibility support.
 *
 * Provides:
 * - `title` attribute with full hash for tooltip on hover
 * - Screen-reader-only span with full hash for assistive technologies
 * - Visual truncated text hidden from screen readers
 *
 * Must be used within a Hash.Root component.
 *
 * @example
 * ```tsx
 * <Hash.Root value="0x1234567890abcdef..." truncate="middle">
 *   <Hash.Truncated />
 * </Hash.Root>
 * // Renders: 0x1234...cdef (with full hash in title and for screen readers)
 * ```
 */
export const HashTruncated = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: HashTruncatedProps): React.ReactNode => {
  const { value, truncate, chars } = useHashContext("Hash.Truncated");

  const truncatedValue = useMemo(
    () => truncateHash(value, { mode: truncate, chars }),
    [value, truncate, chars]
  );

  const Comp = asChild ? Slot : "span";

  // When children are provided, render them directly (custom rendering)
  if (children !== undefined) {
    return (
      <Comp ref={ref} className={className} title={value} {...props}>
        {children}
      </Comp>
    );
  }

  // Default accessible rendering with screen-reader support
  return (
    <Comp ref={ref} className={className} title={value} {...props}>
      <span style={srOnlyStyles}>{value}</span>
      <span aria-hidden="true">{truncatedValue}</span>
    </Comp>
  );
};

HashTruncated.displayName = "Hash.Truncated";
