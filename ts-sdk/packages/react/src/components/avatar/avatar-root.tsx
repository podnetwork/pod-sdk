/**
 * @module components/avatar/avatar-root
 * @description Root component for Avatar compound component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import {
  AvatarContext,
  POD_AVATAR_COLORS,
  type AvatarContextValue,
  type AvatarVariant,
} from "./avatar-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Avatar.Root component.
 * @category Components
 */
export interface AvatarRootProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Unique name for deterministic generation (e.g., wallet address) */
  readonly name: string;
  /** Size in pixels. Default: 32 */
  readonly size?: number;
  /** Avatar variant style. Default: 'pixel' */
  readonly variant?: AvatarVariant;
  /** Custom color palette. Default: POD_AVATAR_COLORS */
  readonly colors?: readonly string[];
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for the Avatar compound component.
 *
 * Provides context for child components and renders the container element.
 * Uses deterministic generation based on the `name` prop to create unique,
 * consistent avatars.
 *
 * **Important:** The Avatar.Image component requires the `boring-avatars` package.
 * Install it with: `pnpm add boring-avatars`
 *
 * @example
 * ```tsx
 * <Avatar.Root name="0x1234...abcd" size={40}>
 *   <Avatar.Image className="rounded-full" />
 * </Avatar.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Using asChild to customize the container
 * <Avatar.Root name={address} asChild>
 *   <button onClick={handleClick}>
 *     <Avatar.Image />
 *   </button>
 * </Avatar.Root>
 * ```
 *
 * @example
 * ```tsx
 * // With custom colors and variant
 * <Avatar.Root
 *   name={address}
 *   variant="beam"
 *   colors={['#FF0000', '#00FF00', '#0000FF']}
 * >
 *   <Avatar.Image />
 * </Avatar.Root>
 * ```
 */
export const AvatarRoot = ({
  name,
  size = 32,
  variant = "pixel",
  colors = POD_AVATAR_COLORS,
  asChild = false,
  className,
  children,
  ref,
  style,
  ...props
}: AvatarRootProps): React.ReactNode => {
  const contextValue = useMemo<AvatarContextValue>(
    () => ({
      name,
      size,
      variant,
      colors,
    }),
    [name, size, variant, colors]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <AvatarContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        style={{ width: size, height: size, ...style }}
        data-variant={variant}
        {...props}
      >
        {children}
      </Comp>
    </AvatarContext.Provider>
  );
};

AvatarRoot.displayName = "Avatar.Root";
