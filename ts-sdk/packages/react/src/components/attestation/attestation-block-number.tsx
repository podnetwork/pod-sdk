/**
 * @module components/attestation/attestation-block-number
 * @description Attestation block number display component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAttestationContext } from "./attestation-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Attestation.BlockNumber component.
 * @category Components
 */
export interface AttestationBlockNumberProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the attestation block number.
 */
export const AttestationBlockNumber = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AttestationBlockNumberProps): React.ReactNode => {
  const { blockNumber } = useAttestationContext("Attestation.BlockNumber");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-block={blockNumber.toString()} {...props}>
      {children ?? blockNumber.toString()}
    </Comp>
  );
};

AttestationBlockNumber.displayName = "Attestation.BlockNumber";
