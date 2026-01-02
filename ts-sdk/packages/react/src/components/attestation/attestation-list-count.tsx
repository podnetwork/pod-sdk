/**
 * @module components/attestation/attestation-list-count
 * @description AttestationList count display component
 */

import type { HTMLAttributes, Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAttestationListContext } from "./attestation-list-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for AttestationList.Count component.
 * @category Components
 */
export interface AttestationListCountProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the count of attestations.
 */
export const AttestationListCount = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AttestationListCountProps): React.ReactNode => {
  const { count } = useAttestationListContext("AttestationList.Count");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-count={count} {...props}>
      {children ?? count.toString()}
    </Comp>
  );
};

AttestationListCount.displayName = "AttestationList.Count";
