/**
 * @module components/attestation/attestation-context
 * @description Attestation context and hook
 */

import { createContext, useContext } from "react";
import type { Address } from "../../types.js";

/**
 * Context value for Attestation compound component.
 * @category Components
 */
export interface AttestationContextValue {
  /** Validator address */
  readonly validator: Address;
  /** Signature bytes */
  readonly signature: string;
  /** Timestamp offset in milliseconds */
  readonly timeOffset: number;
  /** Block number */
  readonly blockNumber: bigint;
  /** Whether the attestation is the first (earliest) in the list */
  readonly isFirst: boolean;
}

export const AttestationContext = createContext<AttestationContextValue | null>(null);
AttestationContext.displayName = "AttestationContext";

/**
 * Hook to access Attestation context.
 *
 * @param componentName - Name of component for error message
 * @returns Attestation context value
 * @throws Error if used outside Attestation.Root
 */
export function useAttestationContext(componentName: string): AttestationContextValue {
  const context = useContext(AttestationContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <Attestation.Root>. ` +
        `Wrap your component with <Attestation.Root attestation={...}>.`
    );
  }
  return context;
}
