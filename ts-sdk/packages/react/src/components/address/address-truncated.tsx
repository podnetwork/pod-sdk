/**
 * @module components/address/address-truncated
 * @description Truncated address display component with accessibility support
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAddressContext } from "./address-context.js";
import { truncateHash } from "../../utils/truncate-hash.js";
import { srOnlyStyles } from "../../utils/styles.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Address.Truncated component.
 * @category Components
 */
export interface AddressTruncatedProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the truncated version of the address with accessibility support.
 *
 * Provides:
 * - `title` attribute with full address for tooltip on hover
 * - Screen-reader-only span with full address for assistive technologies
 * - Visual truncated text hidden from screen readers
 *
 * Must be used within an Address.Root component.
 *
 * @example
 * ```tsx
 * <Address.Root value="0x1234567890abcdef..." truncate="middle">
 *   <Address.Truncated />
 * </Address.Root>
 * // Renders: 0x1234...cdef (with full address in title and for screen readers)
 * ```
 */
export const AddressTruncated = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AddressTruncatedProps): React.ReactNode => {
  const { value, truncate, chars } = useAddressContext("Address.Truncated");

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

AddressTruncated.displayName = "Address.Truncated";
