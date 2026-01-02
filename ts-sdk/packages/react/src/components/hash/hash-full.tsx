/**
 * @module components/hash/hash-full
 * @description Full hash display component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useHashContext } from "./hash-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Hash.Full component.
 * @category Components
 */
export interface HashFullProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the full, untruncated hash.
 *
 * Must be used within a Hash.Root component.
 *
 * @example
 * ```tsx
 * <Hash.Root value="0x1234567890abcdef...">
 *   <Hash.Full />
 * </Hash.Root>
 * // Renders: 0x1234567890abcdef...
 * ```
 *
 * @example
 * ```tsx
 * // Show full hash on hover using CSS
 * <Hash.Root value={hash} className="hash-container">
 *   <Hash.Truncated className="hash-truncated" />
 *   <Hash.Full className="hash-full" />
 * </Hash.Root>
 *
 * // CSS:
 * // .hash-full { display: none; }
 * // .hash-container:hover .hash-truncated { display: none; }
 * // .hash-container:hover .hash-full { display: inline; }
 * ```
 */
export const HashFull = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: HashFullProps): React.ReactNode => {
  const { value } = useHashContext("Hash.Full");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? value}
    </Comp>
  );
};

HashFull.displayName = "Hash.Full";
