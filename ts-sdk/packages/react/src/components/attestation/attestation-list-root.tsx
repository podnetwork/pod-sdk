/**
 * @module components/attestation/attestation-list-root
 * @description AttestationList root component
 */

import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import {
  AttestationListContext,
  type AttestationListContextValue,
} from "./attestation-list-context.js";
import type { BaseComponentProps, Attestation as AttestationData } from "../../types.js";

/**
 * Props for AttestationList.Root component.
 * @category Components
 */
export interface AttestationListRootProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** List of attestations to display */
  readonly attestations: readonly AttestationData[];
  /** Whether loading */
  readonly isLoading?: boolean;
  /** Child components */
  readonly children?: ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for AttestationList compound component.
 *
 * @example
 * ```tsx
 * <AttestationList.Root attestations={attestations}>
 *   <AttestationList.Item>
 *     {(attestation) => (
 *       <Attestation.Root attestation={attestation}>
 *         <Attestation.Validator />
 *         <Attestation.Timestamp />
 *       </Attestation.Root>
 *     )}
 *   </AttestationList.Item>
 * </AttestationList.Root>
 * ```
 */
export const AttestationListRoot = ({
  attestations,
  isLoading = false,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AttestationListRootProps): React.ReactNode => {
  const contextValue = useMemo<AttestationListContextValue>(
    () => ({
      attestations,
      count: attestations.length,
      isLoading,
    }),
    [attestations, isLoading]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <AttestationListContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-count={attestations.length}
        data-state={isLoading ? "loading" : "success"}
        {...props}
      >
        {children}
      </Comp>
    </AttestationListContext.Provider>
  );
};

AttestationListRoot.displayName = "AttestationList.Root";
