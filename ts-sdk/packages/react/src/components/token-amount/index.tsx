/**
 * @module components/token-amount
 * @description TokenAmount compound component for displaying token values
 */

import { createContext, useContext, useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { formatTokenAmount } from "../../utils/format-token.js";
import type { BaseComponentProps } from "../../types.js";

// ============================================================================
// Context
// ============================================================================

interface TokenAmountContextValue {
  readonly value: bigint;
  readonly decimals: number;
  readonly symbol: string | undefined;
  readonly showSymbol: boolean;
  readonly compact: boolean;
  readonly maxDecimals: number;
  readonly formattedValue: string;
  readonly formattedSymbol: string | undefined;
}

const TokenAmountContext = createContext<TokenAmountContextValue | null>(null);
TokenAmountContext.displayName = "TokenAmountContext";

function useTokenAmountContext(componentName: string): TokenAmountContextValue {
  const context = useContext(TokenAmountContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <TokenAmount.Root>. ` +
        `Wrap your component with <TokenAmount.Root value={amount}>.`
    );
  }
  return context;
}

// ============================================================================
// Root Component
// ============================================================================

/**
 * Props for TokenAmount.Root component.
 * @category Components
 */
export interface TokenAmountRootProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Token amount in wei */
  readonly value: bigint;
  /** Token decimals. Default: 18 */
  readonly decimals?: number;
  /** Token symbol (e.g., 'pETH') */
  readonly symbol?: string;
  /** Show symbol after value. Default: true */
  readonly showSymbol?: boolean;
  /** Use compact notation. Default: false */
  readonly compact?: boolean;
  /** Maximum decimal places. Default: 4 */
  readonly maxDecimals?: number;
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Root component for TokenAmount compound component.
 *
 * @example
 * ```tsx
 * <TokenAmount.Root value={1500000000000000000n} symbol="pETH">
 *   <TokenAmount.Value />
 *   <TokenAmount.Symbol />
 * </TokenAmount.Root>
 * // Renders: 1.5 pETH
 * ```
 */
export const TokenAmountRoot = ({
  value,
  decimals = 18,
  symbol,
  showSymbol = true,
  compact = false,
  maxDecimals = 4,
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TokenAmountRootProps): React.ReactNode => {
  const contextValue = useMemo<TokenAmountContextValue>(() => {
    const formattedValue = formatTokenAmount(value, {
      decimals,
      compact,
      maxDecimals,
    });

    return {
      value,
      decimals,
      symbol,
      showSymbol,
      compact,
      maxDecimals,
      formattedValue,
      formattedSymbol: symbol,
    };
  }, [value, decimals, symbol, showSymbol, compact, maxDecimals]);

  const Comp = asChild ? Slot : "span";

  return (
    <TokenAmountContext.Provider value={contextValue}>
      <Comp ref={ref} className={className} data-compact={compact || undefined} {...props}>
        {children ?? (
          <>
            <TokenAmountValue />
            {showSymbol && symbol !== undefined && symbol !== "" && (
              <>
                {" "}
                <TokenAmountSymbol />
              </>
            )}
          </>
        )}
      </Comp>
    </TokenAmountContext.Provider>
  );
};

TokenAmountRoot.displayName = "TokenAmount.Root";

// ============================================================================
// Value Component
// ============================================================================

/**
 * Props for TokenAmount.Value component.
 * @category Components
 */
export interface TokenAmountValueProps extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the formatted token value.
 */
export const TokenAmountValue = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TokenAmountValueProps): React.ReactNode => {
  const { formattedValue } = useTokenAmountContext("TokenAmount.Value");

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? formattedValue}
    </Comp>
  );
};

TokenAmountValue.displayName = "TokenAmount.Value";

// ============================================================================
// Symbol Component
// ============================================================================

/**
 * Props for TokenAmount.Symbol component.
 * @category Components
 */
export interface TokenAmountSymbolProps
  extends BaseComponentProps, HTMLAttributes<HTMLSpanElement> {
  /** Ref to the root element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Displays the token symbol.
 */
export const TokenAmountSymbol = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: TokenAmountSymbolProps): React.ReactNode => {
  const { formattedSymbol } = useTokenAmountContext("TokenAmount.Symbol");

  if (formattedSymbol === undefined && children === undefined) {
    return null;
  }

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} {...props}>
      {children ?? formattedSymbol}
    </Comp>
  );
};

TokenAmountSymbol.displayName = "TokenAmount.Symbol";

// ============================================================================
// Compound Export
// ============================================================================

/**
 * TokenAmount compound component.
 *
 * @example
 * ```tsx
 * <TokenAmount.Root value={1000000000000000000n} symbol="pETH">
 *   <TokenAmount.Value />
 *   <TokenAmount.Symbol />
 * </TokenAmount.Root>
 * ```
 */
export const TokenAmount = {
  Root: TokenAmountRoot,
  Value: TokenAmountValue,
  Symbol: TokenAmountSymbol,
} as const;
