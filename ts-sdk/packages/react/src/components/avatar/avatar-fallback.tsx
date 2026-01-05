/**
 * @module components/avatar/avatar-fallback
 * @description Fallback component for Avatar compound component
 */

import { type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import { useAvatarContext } from "./avatar-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Avatar.Fallback component.
 * @category Components
 */
export interface AvatarFallbackProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Child content to render as fallback */
  readonly children?: React.ReactNode;
  /** Ref to the element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Fallback component rendered when the avatar cannot load.
 *
 * This component is useful for error boundaries or as a placeholder
 * before the avatar image loads.
 *
 * @example
 * ```tsx
 * <Avatar.Root name={address}>
 *   <ErrorBoundary fallback={<Avatar.Fallback>?</Avatar.Fallback>}>
 *     <Avatar.Image />
 *   </ErrorBoundary>
 * </Avatar.Root>
 * ```
 *
 * @example
 * ```tsx
 * // With initials as fallback
 * <Avatar.Root name={address}>
 *   <Avatar.Fallback className="bg-gray-200 flex items-center justify-center">
 *     {getInitials(name)}
 *   </Avatar.Fallback>
 * </Avatar.Root>
 * ```
 */
export const AvatarFallback = ({
  asChild = false,
  className,
  children,
  ref,
  style,
  ...props
}: AvatarFallbackProps): React.ReactNode => {
  const { size, colors } = useAvatarContext("Avatar.Fallback");

  const Comp = asChild ? Slot : "div";

  // Use first color from palette as background
  const backgroundColor = colors[0] || "#E5E7EB";

  return (
    <Comp
      ref={ref}
      className={className}
      style={{
        width: size,
        height: size,
        backgroundColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
      data-fallback="true"
      {...props}
    >
      {children}
    </Comp>
  );
};

AvatarFallback.displayName = "Avatar.Fallback";
