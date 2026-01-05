/**
 * @module components/account-switcher/account-switcher-active-indicator
 * @description Active indicator component for AccountSwitcher compound component
 */

import { type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAccountItemContext } from "./account-switcher-item.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for AccountSwitcher.ActiveIndicator component.
 * @category Components
 */
export interface AccountSwitcherActiveIndicatorProps
  extends BaseComponentProps,
    HTMLAttributes<HTMLSpanElement> {
  /** Child content (only rendered when active) */
  readonly children?: React.ReactNode;
  /** Ref to the element */
  readonly ref?: Ref<HTMLSpanElement>;
}

/**
 * Active indicator component that shows when account is selected.
 *
 * Only renders children when the parent AccountSwitcher.Item is the active account.
 * Useful for showing checkmarks or other selection indicators.
 *
 * @example
 * ```tsx
 * <AccountSwitcher.Item address={account}>
 *   <span>{account}</span>
 *   <AccountSwitcher.ActiveIndicator>
 *     <CheckIcon className="w-4 h-4" />
 *   </AccountSwitcher.ActiveIndicator>
 * </AccountSwitcher.Item>
 * ```
 *
 * @example
 * ```tsx
 * // Without children - just renders an empty span with data-active
 * <AccountSwitcher.Item address={account}>
 *   <span>{account}</span>
 *   <AccountSwitcher.ActiveIndicator className="w-2 h-2 rounded-full bg-green-500" />
 * </AccountSwitcher.Item>
 * ```
 */
export const AccountSwitcherActiveIndicator = ({
  asChild = false,
  className,
  children,
  ref,
  ...props
}: AccountSwitcherActiveIndicatorProps): React.ReactNode => {
  const { isActive } = useAccountItemContext("AccountSwitcher.ActiveIndicator");

  // Don't render anything if not active and no children provided as indicator
  if (!isActive && children != null) {
    return null;
  }

  const Comp = asChild ? Slot : "span";

  return (
    <Comp ref={ref} className={className} data-active={isActive} aria-hidden="true" {...props}>
      {children}
    </Comp>
  );
};

AccountSwitcherActiveIndicator.displayName = "AccountSwitcher.ActiveIndicator";
