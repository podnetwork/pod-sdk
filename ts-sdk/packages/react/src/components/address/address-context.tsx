/**
 * @module components/address/address-context
 * @description Context for Address compound component
 */

import { createContext, useContext } from "react";
import type { TruncateMode } from "../../types.js";

/**
 * Context value shared within Address compound component.
 * @category Components
 */
export interface AddressContextValue {
  /** The full address value */
  readonly value: string;
  /** Truncation mode */
  readonly truncate: TruncateMode;
  /** Number of characters to show at start/end */
  readonly chars: number;
}

/**
 * Address context.
 * @internal
 */
export const AddressContext = createContext<AddressContextValue | null>(null);
AddressContext.displayName = "AddressContext";

/**
 * Hook to access the Address context.
 *
 * @param componentName - Name of the component for error message
 * @throws Error if used outside Address.Root
 *
 * @internal
 */
export function useAddressContext(componentName: string): AddressContextValue {
  const context = useContext(AddressContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <Address.Root>. ` +
        `Wrap your component with <Address.Root value={address}>.`
    );
  }
  return context;
}
