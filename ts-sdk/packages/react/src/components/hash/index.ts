/**
 * @module components/hash
 * @description Hash compound component for displaying blockchain hashes
 *
 * The Hash component provides a flexible way to display blockchain hashes
 * with truncation, copy functionality, and data attributes for styling.
 *
 * @example
 * ```tsx
 * import { Hash } from '@podnetwork/react';
 *
 * function TransactionHash({ hash }) {
 *   return (
 *     <Hash.Root value={hash} truncate="middle" chars={6}>
 *       <Hash.Truncated className="font-mono" />
 *       <Hash.Copy className="ml-2" />
 *     </Hash.Root>
 *   );
 * }
 * ```
 */

import { HashRoot } from "./hash-root.js";
import { HashTruncated } from "./hash-truncated.js";
import { HashFull } from "./hash-full.js";
import { HashCopy } from "./hash-copy.js";

export type { HashContextValue } from "./hash-context.js";
export type { HashRootProps } from "./hash-root.js";
export type { HashTruncatedProps } from "./hash-truncated.js";
export type { HashFullProps } from "./hash-full.js";
export type { HashCopyProps, CopyState } from "./hash-copy.js";

/**
 * Hash compound component.
 *
 * @example
 * ```tsx
 * <Hash.Root value="0x1234567890abcdef...">
 *   <Hash.Truncated />
 *   <Hash.Copy />
 * </Hash.Root>
 * ```
 */
export const Hash = {
  Root: HashRoot,
  Truncated: HashTruncated,
  Full: HashFull,
  Copy: HashCopy,
} as const;

export { HashRoot, HashTruncated, HashFull, HashCopy };
