/**
 * @module components/attestation/attestation-list-context
 * @description AttestationList context and hook
 */

import { createContext, useContext } from "react";
import type { Attestation as AttestationData } from "../../types.js";

/**
 * Context value for AttestationList compound component.
 * @category Components
 */
export interface AttestationListContextValue {
  /** List of attestations */
  readonly attestations: readonly AttestationData[];
  /** Total count */
  readonly count: number;
  /** Whether loading */
  readonly isLoading: boolean;
}

export const AttestationListContext = createContext<AttestationListContextValue | null>(null);
AttestationListContext.displayName = "AttestationListContext";

/**
 * Hook to access AttestationList context.
 *
 * @param componentName - Name of component for error message
 * @returns AttestationList context value
 * @throws Error if used outside AttestationList.Root
 */
export function useAttestationListContext(componentName: string): AttestationListContextValue {
  const context = useContext(AttestationListContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <AttestationList.Root>. ` +
        `Wrap your component with <AttestationList.Root attestations={...}>.`
    );
  }
  return context;
}
