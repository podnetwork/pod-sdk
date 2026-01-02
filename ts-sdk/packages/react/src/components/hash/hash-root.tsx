/**
 * @module components/hash/hash-root
 * @description Root component for Hash compound component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { HashContext, type HashContextValue } from "./hash-context.js";
import type { BaseComponentProps, TruncateMode } from "../../types.js";

/**
 * Props for Hash.Root component.
 * @category Components
 */
export interface HashRootProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** The hash value to display */
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
 * Root component for the Hash compound component.
 *
 * Provides context for child components and renders the container element.
 *
 * @example
 * ```tsx
 * <Hash.Root value="0x1234...abcd" truncate="middle" chars={6}>
 *   <Hash.Truncated />
 *   <Hash.Copy />
 * </Hash.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Using asChild to customize the element
 * <Hash.Root value={txHash} asChild>
 *   <a href={`/tx/${txHash}`}>
 *     <Hash.Truncated />
 *   </a>
 * </Hash.Root>
 * ```
 */
export const HashRoot = ({
  value,
  truncate = "middle",
  chars = 6,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: HashRootProps): React.ReactNode => {
  const contextValue = useMemo<HashContextValue>(
    () => ({
      value,
      truncate,
      chars,
    }),
    [value, truncate, chars]
  );

  const Comp = asChild ? Slot : "span";

  return (
    <HashContext.Provider value={contextValue}>
      <Comp ref={ref} className={className} data-truncate={truncate} {...props}>
        {children}
      </Comp>
    </HashContext.Provider>
  );
};

HashRoot.displayName = "Hash.Root";
