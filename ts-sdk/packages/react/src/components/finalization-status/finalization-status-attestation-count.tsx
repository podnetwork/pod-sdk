/**
 * @module components/finalization-status/finalization-status-attestation-count
 * @description FinalizationStatus attestation count display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useFinalizationStatusContext } from "./finalization-status-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for FinalizationStatus.AttestationCount component.
 * @category Components
 */
export interface FinalizationStatusAttestationCountProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Format: "count" shows just count, "ratio" shows count/total. Default: "count" */
  readonly format?: "count" | "ratio";
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the attestation count.
 *
 * @example
 * ```tsx
 * <FinalizationStatus.AttestationCount format="ratio" />
 * // Renders: "45/67"
 * ```
 */
export const FinalizationStatusAttestationCount = ({
  asChild = false,
  className,
  format = "count",
  children,
  ref,
  ...props
}: FinalizationStatusAttestationCountProps): React.ReactNode => {
  const { attestationCount, totalValidators } = useFinalizationStatusContext(
    "FinalizationStatus.AttestationCount"
  );

  const quorumRequired = Math.ceil(totalValidators * 0.67);

  const displayValue = useMemo(() => {
    if (format === "ratio") {
      return `${String(attestationCount)}/${String(quorumRequired)}`;
    }
    return attestationCount.toString();
  }, [attestationCount, quorumRequired, format]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      className={className}
      data-count={attestationCount}
      data-quorum={quorumRequired}
      {...props}
    >
      {children ?? displayValue}
    </Comp>
  );
};

FinalizationStatusAttestationCount.displayName = "FinalizationStatus.AttestationCount";
