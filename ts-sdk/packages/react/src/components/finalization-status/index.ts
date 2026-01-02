/**
 * @module components/finalization-status
 * @description FinalizationStatus compound component for displaying transaction finalization progress
 *
 * @example
 * ```tsx
 * import { FinalizationStatus } from '@podnetwork/react';
 *
 * function TransactionProgress({ hash }) {
 *   return (
 *     <FinalizationStatus.Root hash={hash}>
 *       <div className="progress-container">
 *         <FinalizationStatus.Progress className="progress-bar" />
 *       </div>
 *       <FinalizationStatus.Percentage /> complete
 *       <FinalizationStatus.Badge />
 *       <FinalizationStatus.AttestationCount format="ratio" /> attestations
 *     </FinalizationStatus.Root>
 *   );
 * }
 * ```
 */

import { FinalizationStatusRoot } from "./finalization-status-root.js";
import { FinalizationStatusProgress } from "./finalization-status-progress.js";
import { FinalizationStatusPercentage } from "./finalization-status-percentage.js";
import { FinalizationStatusBadge } from "./finalization-status-badge.js";
import { FinalizationStatusAttestationCount } from "./finalization-status-attestation-count.js";
import { FinalizationStatusElapsedTime } from "./finalization-status-elapsed-time.js";

export { useFinalizationStatusContext } from "./finalization-status-context.js";
export type { FinalizationStatusContextValue } from "./finalization-status-context.js";
export type { FinalizationStatusRootProps } from "./finalization-status-root.js";
export type { FinalizationStatusProgressProps } from "./finalization-status-progress.js";
export type { FinalizationStatusPercentageProps } from "./finalization-status-percentage.js";
export type { FinalizationStatusBadgeProps } from "./finalization-status-badge.js";
export type { FinalizationStatusAttestationCountProps } from "./finalization-status-attestation-count.js";
export type { FinalizationStatusElapsedTimeProps } from "./finalization-status-elapsed-time.js";

/**
 * FinalizationStatus compound component for displaying transaction finalization progress.
 *
 * @example
 * ```tsx
 * <FinalizationStatus.Root hash="0x123...">
 *   <div className="progress-container">
 *     <FinalizationStatus.Progress className="progress-bar" />
 *   </div>
 *   <FinalizationStatus.Percentage /> complete
 *   <FinalizationStatus.Badge />
 *   <FinalizationStatus.AttestationCount format="ratio" /> attestations
 * </FinalizationStatus.Root>
 * ```
 */
export const FinalizationStatus = {
  Root: FinalizationStatusRoot,
  Progress: FinalizationStatusProgress,
  Percentage: FinalizationStatusPercentage,
  Badge: FinalizationStatusBadge,
  AttestationCount: FinalizationStatusAttestationCount,
  ElapsedTime: FinalizationStatusElapsedTime,
} as const;

export {
  FinalizationStatusRoot,
  FinalizationStatusProgress,
  FinalizationStatusPercentage,
  FinalizationStatusBadge,
  FinalizationStatusAttestationCount,
  FinalizationStatusElapsedTime,
};
