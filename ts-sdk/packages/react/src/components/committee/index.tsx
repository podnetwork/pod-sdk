/**
 * @module components/committee
 * @description Committee compound component for displaying pod network committee information
 */

import {
  createContext,
  useContext,
  useMemo,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import type { Validator, BaseComponentProps } from "../../types.js";

// ============================================================================
// Context
// ============================================================================

/**
 * Committee context value.
 * @category Components
 */
export interface CommitteeContextValue {
  /** List of validators in the committee */
  readonly validators: readonly Validator[];
  /** Required quorum size (n - f) */
  readonly quorumSize: number | null;
  /** Low quorum size (n - 3f) */
  readonly lowQuorumSize: number | null;
  /** Solver quorum size (n - 2f) */
  readonly solverQuorumSize: number | null;
  /** Total number of validators */
  readonly totalValidators: number;
  /** Whether the data is loading */
  readonly isLoading: boolean;
}

const CommitteeContext = createContext<CommitteeContextValue | null>(null);

/**
 * Hook to access committee context.
 * @throws Error if used outside Committee.Root
 */
export function useCommitteeContext(componentName: string): CommitteeContextValue {
  const context = useContext(CommitteeContext);
  if (context === null) {
    throw new Error(`<${componentName}> must be used within <Committee.Root>`);
  }
  return context;
}

// ============================================================================
// Root Component
// ============================================================================

/**
 * Props for Committee.Root component.
 * @category Components
 */
export interface CommitteeRootProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** List of validators to display */
  readonly validators?: readonly Validator[];
  /** Quorum size (n - f) */
  readonly quorumSize?: number;
  /** Low quorum size (n - 3f) */
  readonly lowQuorumSize?: number;
  /** Solver quorum size (n - 2f) */
  readonly solverQuorumSize?: number;
  /** Whether data is loading */
  readonly isLoading?: boolean;
  /** Children elements */
  readonly children?: ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for the Committee compound component.
 *
 * Provides context for child components to access committee data.
 *
 * @example
 * ```tsx
 * <Committee.Root validators={validators} quorumSize={67}>
 *   <Committee.Validators />
 *   <Committee.QuorumSize />
 * </Committee.Root>
 * ```
 */
export const CommitteeRoot = ({
  validators = [],
  quorumSize,
  lowQuorumSize,
  solverQuorumSize,
  isLoading = false,
  asChild = false,
  children,
  ref,
  ...props
}: CommitteeRootProps): React.ReactNode => {
  const contextValue = useMemo<CommitteeContextValue>(
    () => ({
      validators,
      quorumSize: quorumSize ?? null,
      lowQuorumSize: lowQuorumSize ?? null,
      solverQuorumSize: solverQuorumSize ?? null,
      totalValidators: validators.length,
      isLoading,
    }),
    [validators, quorumSize, lowQuorumSize, solverQuorumSize, isLoading]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <CommitteeContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        data-state={isLoading ? "loading" : "success"}
        data-committee-size={validators.length}
        {...props}
      >
        {children}
      </Comp>
    </CommitteeContext.Provider>
  );
};

CommitteeRoot.displayName = "Committee.Root";

// ============================================================================
// Validators Component
// ============================================================================

/**
 * Props for Committee.Validators component.
 * @category Components
 */
export interface CommitteeValidatorsProps
  extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Custom render function for each validator */
  readonly renderValidator?: (validator: Validator, index: number) => ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Displays the list of validators.
 *
 * @example
 * ```tsx
 * <Committee.Validators
 *   renderValidator={(validator, i) => (
 *     <div key={validator.index}>
 *       Validator #{validator.index}: {validator.address}
 *     </div>
 *   )}
 * />
 * ```
 */
export const CommitteeValidators = ({
  asChild = false,
  renderValidator,
  children: _children,
  ref,
  ...props
}: CommitteeValidatorsProps): React.ReactNode => {
  const { validators } = useCommitteeContext("Committee.Validators");

  const Comp = asChild ? Slot : "div";

  if (renderValidator !== undefined) {
    return (
      <Comp ref={ref} data-validator-count={validators.length} {...props}>
        {validators.map(async (validator, index) => renderValidator(validator, index))}
      </Comp>
    );
  }

  // Default rendering
  return (
    <Comp ref={ref} data-validator-count={validators.length} {...props}>
      {validators.map((validator) => (
        <div key={validator.index} data-validator-index={validator.index}>
          Validator #{validator.index}
        </div>
      ))}
    </Comp>
  );
};

CommitteeValidators.displayName = "Committee.Validators";

// ============================================================================
// QuorumSize Component
// ============================================================================

/**
 * Props for Committee.QuorumSize component.
 * @category Components
 */
export interface CommitteeQuorumSizeProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the quorum size (n - f).
 *
 * @example
 * ```tsx
 * <Committee.QuorumSize />
 * // Renders: "3" (for a 4-node committee)
 * ```
 */
export const CommitteeQuorumSize = ({
  asChild = false,
  children,
  ref,
  ...props
}: CommitteeQuorumSizeProps): React.ReactNode => {
  const { quorumSize } = useCommitteeContext("Committee.QuorumSize");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} data-quorum-size={quorumSize ?? "unknown"} {...props}>
      {children ?? (quorumSize !== null ? quorumSize.toString() : "—")}
    </Comp>
  );
};

CommitteeQuorumSize.displayName = "Committee.QuorumSize";

// ============================================================================
// TotalValidators Component
// ============================================================================

/**
 * Props for Committee.TotalValidators component.
 * @category Components
 */
export interface CommitteeTotalValidatorsProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the total number of validators.
 *
 * @example
 * ```tsx
 * <Committee.TotalValidators />
 * // Renders: "4"
 * ```
 */
export const CommitteeTotalValidators = ({
  asChild = false,
  children,
  ref,
  ...props
}: CommitteeTotalValidatorsProps): React.ReactNode => {
  const { totalValidators } = useCommitteeContext("Committee.TotalValidators");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} data-total-validators={totalValidators} {...props}>
      {children ?? totalValidators.toString()}
    </Comp>
  );
};

CommitteeTotalValidators.displayName = "Committee.TotalValidators";

// ============================================================================
// Compound Export
// ============================================================================

/**
 * Committee compound component for displaying pod network committee information.
 *
 * @example
 * ```tsx
 * <Committee.Root validators={validators} quorumSize={3}>
 *   <div>Committee Size: <Committee.TotalValidators /></div>
 *   <div>Quorum Required: <Committee.QuorumSize /></div>
 *   <Committee.Validators
 *     renderValidator={(v) => (
 *       <div key={v.index}>Validator #{v.index}: {v.address}</div>
 *     )}
 *   />
 * </Committee.Root>
 * ```
 */
export const Committee = {
  Root: CommitteeRoot,
  Validators: CommitteeValidators,
  QuorumSize: CommitteeQuorumSize,
  TotalValidators: CommitteeTotalValidators,
};

export default Committee;
