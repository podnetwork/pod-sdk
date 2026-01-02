/**
 * @module components/attestation
 * @description Attestation compound components for displaying pod transaction attestations
 *
 * @example
 * ```tsx
 * import { Attestation, AttestationList } from '@podnetwork/react';
 *
 * function AttestationDetails({ attestation }) {
 *   return (
 *     <Attestation.Root attestation={attestation}>
 *       <Attestation.Validator truncate="middle" />
 *       <Attestation.Timestamp format="relative" />
 *       <Attestation.Signature truncate="middle" />
 *     </Attestation.Root>
 *   );
 * }
 *
 * function AttestationsList({ attestations }) {
 *   return (
 *     <AttestationList.Root attestations={attestations}>
 *       <div>Total: <AttestationList.Count /></div>
 *       <AttestationList.Item>
 *         {(attestation, index) => (
 *           <Attestation.Root key={index} attestation={attestation}>
 *             <Attestation.Validator />
 *           </Attestation.Root>
 *         )}
 *       </AttestationList.Item>
 *     </AttestationList.Root>
 *   );
 * }
 * ```
 */

import { AttestationRoot } from "./attestation-root.js";
import { AttestationTimestamp } from "./attestation-timestamp.js";
import { AttestationSignature } from "./attestation-signature.js";
import { AttestationValidator } from "./attestation-validator.js";
import { AttestationBlockNumber } from "./attestation-block-number.js";
import { AttestationListRoot } from "./attestation-list-root.js";
import { AttestationListItem } from "./attestation-list-item.js";
import { AttestationListCount } from "./attestation-list-count.js";

export { useAttestationContext } from "./attestation-context.js";
export type { AttestationContextValue } from "./attestation-context.js";
export type { AttestationRootProps } from "./attestation-root.js";
export type { AttestationTimestampProps } from "./attestation-timestamp.js";
export type { AttestationSignatureProps } from "./attestation-signature.js";
export type { AttestationValidatorProps } from "./attestation-validator.js";
export type { AttestationBlockNumberProps } from "./attestation-block-number.js";

export { useAttestationListContext } from "./attestation-list-context.js";
export type { AttestationListContextValue } from "./attestation-list-context.js";
export type { AttestationListRootProps } from "./attestation-list-root.js";
export type { AttestationListItemProps } from "./attestation-list-item.js";
export type { AttestationListCountProps } from "./attestation-list-count.js";

/**
 * Attestation compound component for displaying individual attestations.
 *
 * @example
 * ```tsx
 * <Attestation.Root attestation={attestation}>
 *   <Attestation.Validator truncate="middle" />
 *   <Attestation.Timestamp format="relative" />
 *   <Attestation.Signature truncate="middle" />
 * </Attestation.Root>
 * ```
 */
export const Attestation = {
  Root: AttestationRoot,
  Timestamp: AttestationTimestamp,
  Signature: AttestationSignature,
  Validator: AttestationValidator,
  BlockNumber: AttestationBlockNumber,
} as const;

/**
 * AttestationList compound component for displaying lists of attestations.
 *
 * @example
 * ```tsx
 * <AttestationList.Root attestations={attestations}>
 *   <div>Total: <AttestationList.Count /></div>
 *   <AttestationList.Item>
 *     {(attestation, index) => (
 *       <Attestation.Root key={index} attestation={attestation}>
 *         <Attestation.Validator />
 *         <Attestation.Timestamp />
 *       </Attestation.Root>
 *     )}
 *   </AttestationList.Item>
 * </AttestationList.Root>
 * ```
 */
export const AttestationList = {
  Root: AttestationListRoot,
  Item: AttestationListItem,
  Count: AttestationListCount,
} as const;

export {
  AttestationRoot,
  AttestationTimestamp,
  AttestationSignature,
  AttestationValidator,
  AttestationBlockNumber,
  AttestationListRoot,
  AttestationListItem,
  AttestationListCount,
};
