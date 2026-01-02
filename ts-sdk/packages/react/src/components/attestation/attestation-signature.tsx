/**
 * @module components/attestation/attestation-signature
 * @description Attestation signature display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAttestationContext } from "./attestation-context.js";
import { truncateHash } from "../../utils/truncate-hash.js";
import type { BaseComponentProps, TruncateMode } from "../../types.js";

/**
 * Props for Attestation.Signature component.
 * @category Components
 */
export interface AttestationSignatureProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** How to truncate the signature. Default: 'middle' */
  readonly truncate?: TruncateMode;
  /** Number of characters to show at start/end. Default: 8 */
  readonly chars?: number;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the attestation signature.
 */
export const AttestationSignature = ({
  asChild = false,
  className,
  truncate = "middle",
  chars = 8,
  children,
  ref,
  ...props
}: AttestationSignatureProps): React.ReactNode => {
  const { signature } = useAttestationContext("Attestation.Signature");

  const displaySig = useMemo(() => {
    if (truncate === "none") return signature;
    return truncateHash(signature, { mode: truncate, chars });
  }, [signature, truncate, chars]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-truncate={truncate} title={signature} {...props}>
      {children ?? displaySig}
    </Comp>
  );
};

AttestationSignature.displayName = "Attestation.Signature";
