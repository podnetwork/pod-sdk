/**
 * @module components/attestation/attestation-validator
 * @description Attestation validator address display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAttestationContext } from "./attestation-context.js";
import { truncateHash } from "../../utils/truncate-hash.js";
import type { BaseComponentProps, TruncateMode } from "../../types.js";

/**
 * Props for Attestation.Validator component.
 * @category Components
 */
export interface AttestationValidatorProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** How to truncate the address. Default: 'middle' */
  readonly truncate?: TruncateMode;
  /** Number of characters to show at start/end. Default: 6 */
  readonly chars?: number;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the validator address.
 */
export const AttestationValidator = ({
  asChild = false,
  className,
  truncate = "middle",
  chars = 6,
  children,
  ref,
  ...props
}: AttestationValidatorProps): React.ReactNode => {
  const { validator } = useAttestationContext("Attestation.Validator");

  const displayAddr = useMemo(() => {
    if (truncate === "none") return validator;
    return truncateHash(validator, { mode: truncate, chars });
  }, [validator, truncate, chars]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-truncate={truncate} title={validator} {...props}>
      {children ?? displayAddr}
    </Comp>
  );
};

AttestationValidator.displayName = "Attestation.Validator";
