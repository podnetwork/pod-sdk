/**
 * @module components/hash/hash-copy
 * @description Copy button component for Hash
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type Ref,
} from "react";
import { Slot } from "../primitives/slot.js";
import { useHashContext } from "./hash-context.js";
import { copyToClipboard, isClipboardAvailable } from "../../utils/clipboard.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Copy button state.
 */
export type CopyState = "idle" | "copying" | "copied" | "error";

/**
 * Props for Hash.Copy component.
 * @category Components
 */
export interface HashCopyProps extends BaseComponentProps, ButtonHTMLAttributes<HTMLButtonElement> {
  /** Behavior when Clipboard API unavailable. Default: 'hide' */
  readonly unavailableBehavior?: "hide" | "disabled";
  /** Duration to show "copied" state in ms. Default: 2000 */
  readonly feedbackDuration?: number;
  /** Callback when copy succeeds */
  readonly onCopySuccess?: () => void;
  /** Callback when copy fails */
  readonly onCopyError?: (error: Error) => void;
  /** Ref to the button element */
  readonly ref?: Ref<HTMLButtonElement>;
}

/**
 * Copy button for the hash value.
 *
 * Must be used within a Hash.Root component.
 *
 * @example
 * ```tsx
 * <Hash.Root value="0x1234...">
 *   <Hash.Truncated />
 *   <Hash.Copy />
 * </Hash.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Custom copy button with callbacks
 * <Hash.Copy
 *   onCopySuccess={() => toast('Copied!')}
 *   onCopyError={(e) => toast.error(e.message)}
 *   feedbackDuration={3000}
 * >
 *   📋 Copy
 * </Hash.Copy>
 * ```
 *
 * @example
 * ```tsx
 * // Style based on state using data attributes
 * <Hash.Copy className="copy-btn" />
 *
 * // CSS:
 * // .copy-btn[data-state="copied"] { color: green; }
 * // .copy-btn[data-state="error"] { color: red; }
 * // .copy-btn[data-clipboard-unavailable] { opacity: 0.5; }
 * ```
 */
export const HashCopy = ({
  asChild = false,
  className,
  children,
  unavailableBehavior = "hide",
  feedbackDuration = 2000,
  onCopySuccess,
  onCopyError,
  disabled,
  onClick,
  ref,
  ...props
}: HashCopyProps): React.ReactNode => {
  const { value } = useHashContext("Hash.Copy");
  const [state, setState] = useState<CopyState>("idle");
  const [clipboardAvailable, setClipboardAvailable] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isMountedRef = useRef(true);

  // Check clipboard availability on mount (client-side only)
  useEffect(() => {
    isMountedRef.current = true;
    setClipboardAvailable(isClipboardAvailable());
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      // Call original onClick if provided
      onClick?.(event);

      if (state === "copying" || !clipboardAvailable) {
        return;
      }

      setState("copying");

      void (async () => {
        try {
          await copyToClipboard(value);
          if (isMountedRef.current) {
            setState("copied");
            onCopySuccess?.();

            // Reset to idle after feedback duration
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setState("idle");
              }
            }, feedbackDuration);
          }
        } catch (error) {
          if (isMountedRef.current) {
            setState("error");
            onCopyError?.(error instanceof Error ? error : new Error(String(error)));

            // Reset to idle after feedback duration
            timeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) {
                setState("idle");
              }
            }, feedbackDuration);
          }
        }
      })();
    },
    [value, state, clipboardAvailable, feedbackDuration, onCopySuccess, onCopyError, onClick]
  );

  // Hide button if clipboard unavailable and behavior is 'hide'
  if (!clipboardAvailable && unavailableBehavior === "hide") {
    return null;
  }

  const isDisabled = (disabled ?? false) || !clipboardAvailable || state === "copying";

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      type="button"
      className={className}
      disabled={isDisabled}
      onClick={handleClick}
      data-state={state}
      {...(!clipboardAvailable && { "data-clipboard-unavailable": "" })}
      aria-label={state === "copied" ? "Copied to clipboard" : "Copy to clipboard"}
      {...props}
    >
      {children}
    </Comp>
  );
};

HashCopy.displayName = "Hash.Copy";
