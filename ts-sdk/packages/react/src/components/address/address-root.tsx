/**
 * @module components/address/address-root
 * @description Root component for Address compound component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { AddressContext, type AddressContextValue } from "./address-context.js";
import type { BaseComponentProps, TruncateMode } from "../../types.js";

/**
 * Props for Address.Root component.
 * @category Components
 */
export interface AddressRootProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** The Ethereum address to display */
  readonly value: string;
  /** Truncation mode. Default: 'middle' */
  readonly truncate?: TruncateMode;
  /** Number of characters to show at start/end. Default: 6 */
  readonly chars?: number;
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Root component for the Address compound component.
 *
 * Similar to Hash.Root but optimized for Ethereum addresses.
 *
 * @example
 * ```tsx
 * <Address.Root value="0x1234...abcd">
 *   <Address.Truncated />
 *   <Address.Copy />
 * </Address.Root>
 * ```
 */
export const AddressRoot = ({
  value,
  truncate = "middle",
  chars = 6,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AddressRootProps): React.ReactNode => {
  const contextValue = useMemo<AddressContextValue>(
    () => ({
      value,
      truncate,
      chars,
    }),
    [value, truncate, chars]
  );

  const Comp = asChild ? Slot : "span";

  return (
    <AddressContext.Provider value={contextValue}>
      <Comp ref={ref} className={className} data-truncate={truncate} {...props}>
        {children}
      </Comp>
    </AddressContext.Provider>
  );
};

AddressRoot.displayName = "Address.Root";
