/**
 * @module components/attestation/attestation-list-item
 * @description AttestationList item render component
 */

import { useMemo, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAttestationListContext } from "./attestation-list-context.js";
import type { BaseComponentProps, Attestation as AttestationData } from "../../types.js";

/**
 * Props for AttestationList.Item component.
 * @category Components
 */
export interface AttestationListItemProps
  extends BaseComponentProps, Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Render function for each attestation */
  readonly children: (attestation: AttestationData, index: number) => ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Renders each attestation in the list.
 */
export const AttestationListItem = ({
  asChild = false,
  className,
  children: renderFn,
  ref,
  ...props
}: AttestationListItemProps): React.ReactNode => {
  const { attestations } = useAttestationListContext("AttestationList.Item");

  // Sort by time offset to get order
  const sortedAttestations = useMemo(() => {
    return [...attestations].sort((a, b) => a.timeOffset - b.timeOffset);
  }, [attestations]);

  const Comp = asChild ? Slot : "div";

  return (
    <Comp ref={ref} className={className} {...props}>
      {sortedAttestations.map(async (attestation, index) => renderFn(attestation, index))}
    </Comp>
  );
};

AttestationListItem.displayName = "AttestationList.Item";
