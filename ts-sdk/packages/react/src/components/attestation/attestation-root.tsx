/**
 * @module components/attestation/attestation-root
 * @description Attestation root component
 */

import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { AttestationContext, type AttestationContextValue } from "./attestation-context.js";
import type { BaseComponentProps, Attestation as AttestationData } from "../../types.js";

/**
 * Props for Attestation.Root component.
 * @category Components
 */
export interface AttestationRootProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Attestation data */
  readonly attestation: AttestationData;
  /** Whether this is the first (earliest) attestation */
  readonly isFirst?: boolean;
  /** Child components */
  readonly children?: ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for Attestation compound component.
 *
 * @example
 * ```tsx
 * <Attestation.Root attestation={attestation}>
 *   <Attestation.Validator truncate="middle" />
 *   <Attestation.Timestamp />
 * </Attestation.Root>
 * ```
 */
export const AttestationRoot = ({
  attestation,
  isFirst = false,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AttestationRootProps): React.ReactNode => {
  const contextValue = useMemo<AttestationContextValue>(
    () => ({
      validator: attestation.validator,
      signature: attestation.signature,
      timeOffset: attestation.timeOffset,
      blockNumber: attestation.blockNumber,
      isFirst,
    }),
    [attestation, isFirst]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <AttestationContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        data-first={isFirst || undefined}
        data-block-number={attestation.blockNumber.toString()}
        {...props}
      >
        {children}
      </Comp>
    </AttestationContext.Provider>
  );
};

AttestationRoot.displayName = "Attestation.Root";
