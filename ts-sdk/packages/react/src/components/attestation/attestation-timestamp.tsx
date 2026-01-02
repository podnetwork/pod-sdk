/**
 * @module components/attestation/attestation-timestamp
 * @description Attestation timestamp display component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAttestationContext } from "./attestation-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Attestation.Timestamp component.
 * @category Components
 */
export interface AttestationTimestampProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Format for the time offset. Default: 'relative' */
  readonly format?: "relative" | "ms" | "s";
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the attestation timestamp offset.
 */
export const AttestationTimestamp = ({
  asChild = false,
  className,
  format = "relative",
  children,
  ref,
  ...props
}: AttestationTimestampProps): React.ReactNode => {
  const { timeOffset } = useAttestationContext("Attestation.Timestamp");

  const displayTime = useMemo(() => {
    if (format === "ms") return `${String(timeOffset)}ms`;
    if (format === "s") return `${(timeOffset / 1000).toFixed(2)}s`;
    // relative format
    if (timeOffset < 1000) return `${String(timeOffset)}ms`;
    if (timeOffset < 60000) return `${(timeOffset / 1000).toFixed(1)}s`;
    return `${String(Math.floor(timeOffset / 60000))}m ${String(Math.floor((timeOffset % 60000) / 1000))}s`;
  }, [timeOffset, format]);

  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      ref={ref}
      className={className}
      data-format={format}
      data-offset-ms={timeOffset}
      {...props}
    >
      {children ?? displayTime}
    </Comp>
  );
};

AttestationTimestamp.displayName = "Attestation.Timestamp";
