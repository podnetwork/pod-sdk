/**
 * @module components/avatar/avatar-image
 * @description Image component for Avatar compound component
 */

import { type HTMLAttributes, type Ref, useEffect, useState, type ComponentType } from "react";
import { Slot } from "../primitives/slot.js";
import { useAvatarContext, type AvatarVariant } from "./avatar-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for Avatar.Image component.
 * @category Components
 */
export interface AvatarImageProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Ref to the element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Boring avatars component type.
 */
interface BoringAvatarProps {
  name: string;
  variant: AvatarVariant;
  size: number;
  colors: readonly string[];
  square?: boolean;
}

/**
 * Cache for the boring-avatars component.
 */
let cachedBoringAvatar: ComponentType<BoringAvatarProps> | null = null;
let loadAttempted = false;
let loadError: Error | null = null;

/**
 * Dynamically load the boring-avatars package.
 * Returns the Avatar component or throws an error if not installed.
 */
function loadBoringAvatars(): ComponentType<BoringAvatarProps> {
  if (cachedBoringAvatar != null) {
    return cachedBoringAvatar;
  }

  if (loadError != null) {
    throw loadError;
  }

  if (loadAttempted) {
    throw new Error(
      'Avatar.Image requires the "boring-avatars" package. ' +
        "Install it with: pnpm add boring-avatars"
    );
  }

  loadAttempted = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const boringAvatars = require("boring-avatars");
    cachedBoringAvatar = (boringAvatars.default || boringAvatars) as ComponentType<BoringAvatarProps>;
    return cachedBoringAvatar;
  } catch {
    loadError = new Error(
      'Avatar.Image requires the "boring-avatars" package. ' +
        "Install it with: pnpm add boring-avatars"
    );
    throw loadError;
  }
}

/**
 * Image component that renders the avatar.
 *
 * Renders a deterministic avatar based on the `name` prop from Avatar.Root.
 * Uses the `boring-avatars` library under the hood.
 *
 * **Important:** This component requires the `boring-avatars` package.
 * Install it with: `pnpm add boring-avatars`
 *
 * @example
 * ```tsx
 * <Avatar.Root name={address}>
 *   <Avatar.Image className="rounded-full" />
 * </Avatar.Root>
 * ```
 */
export const AvatarImage = ({
  asChild = false,
  className,
  ref,
  ...props
}: AvatarImageProps): React.ReactNode => {
  const { name, size, variant, colors } = useAvatarContext("Avatar.Image");
  const [Avatar, setAvatar] = useState<ComponentType<BoringAvatarProps> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const AvatarComponent = loadBoringAvatars();
      setAvatar(() => AvatarComponent);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  if (error != null) {
    throw error;
  }

  if (Avatar == null) {
    // Loading state - render empty placeholder with same dimensions
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={className}
        style={{ width: size, height: size }}
        data-loading="true"
        {...props}
      />
    );
  }

  const Comp = asChild ? Slot : "div";

  return (
    <Comp ref={ref} className={className} {...props}>
      <Avatar name={name} variant={variant} size={size} colors={colors} square={false} />
    </Comp>
  );
};

AvatarImage.displayName = "Avatar.Image";
