/**
 * @module components/hash/hash-context
 * @description Context for Hash compound component
 */

import { createContext, useContext } from "react";
import type { TruncateMode } from "../../types.js";

/**
 * Context value shared within Hash compound component.
 * @category Components
 */
export interface HashContextValue {
  /** The full hash value */
  readonly value: string;
  /** Truncation mode */
  readonly truncate: TruncateMode;
  /** Number of characters to show at start/end */
  readonly chars: number;
}

/**
 * Hash context.
 * @internal
 */
export const HashContext = createContext<HashContextValue | null>(null);
HashContext.displayName = "HashContext";

/**
 * Hook to access the Hash context.
 *
 * @param componentName - Name of the component for error message
 * @throws Error if used outside Hash.Root
 *
 * @internal
 */
export function useHashContext(componentName: string): HashContextValue {
  const context = useContext(HashContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <Hash.Root>. ` +
        `Wrap your component with <Hash.Root value={hash}>.`
    );
  }
  return context;
}
