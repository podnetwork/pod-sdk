/**
 * @module components/finalization-status/finalization-status-context
 * @description FinalizationStatus context and hook
 */

import { createContext, useContext } from "react";
import type { FinalizationStage } from "../../hooks/use-finalization-status.js";
import type { PodError } from "../../types.js";

/**
 * Context value for FinalizationStatus compound component.
 * @category Components
 */
export interface FinalizationStatusContextValue {
  /** Current finalization stage */
  readonly stage: FinalizationStage;
  /** Number of attestations received */
  readonly attestationCount: number;
  /** Total validators in committee */
  readonly totalValidators: number;
  /** Progress percentage (0-100) */
  readonly progress: number;
  /** Whether finalization is complete */
  readonly isFinalized: boolean;
  /** Whether loading */
  readonly isLoading: boolean;
  /** Error if any */
  readonly error: PodError | null;
  /** Elapsed time since submission in ms */
  readonly elapsedTime: number | null;
}

export const FinalizationStatusContext = createContext<FinalizationStatusContextValue | null>(null);
FinalizationStatusContext.displayName = "FinalizationStatusContext";

/**
 * Hook to access FinalizationStatus context.
 *
 * @param componentName - Name of component for error message
 * @returns FinalizationStatus context value
 * @throws Error if used outside FinalizationStatus.Root
 */
export function useFinalizationStatusContext(
  componentName: string
): FinalizationStatusContextValue {
  const context = useContext(FinalizationStatusContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <FinalizationStatus.Root>. ` +
        `Wrap your component with <FinalizationStatus.Root hash={txHash}>.`
    );
  }
  return context;
}
