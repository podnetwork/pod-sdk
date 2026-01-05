/**
 * @module components/avatar
 * @description Avatar compound component for displaying deterministic avatars
 *
 * The Avatar component provides a flexible way to display deterministic avatars
 * based on unique identifiers like wallet addresses.
 *
 * **Important:** The Avatar.Image component requires the `boring-avatars` package.
 * Install it with: `pnpm add boring-avatars`
 *
 * @example
 * ```tsx
 * import { Avatar, POD_AVATAR_COLORS } from '@podnetwork/react';
 *
 * function WalletAvatar({ address }) {
 *   return (
 *     <Avatar.Root name={address} size={40} variant="pixel">
 *       <Avatar.Image className="rounded-full" />
 *     </Avatar.Root>
 *   );
 * }
 * ```
 */

import { AvatarRoot } from "./avatar-root.js";
import { AvatarImage } from "./avatar-image.js";
import { AvatarFallback } from "./avatar-fallback.js";

export type { AvatarContextValue, AvatarVariant } from "./avatar-context.js";
export { useAvatarContext, POD_AVATAR_COLORS } from "./avatar-context.js";
export type { AvatarRootProps } from "./avatar-root.js";
export type { AvatarImageProps } from "./avatar-image.js";
export type { AvatarFallbackProps } from "./avatar-fallback.js";

/**
 * Avatar compound component.
 *
 * Displays deterministic avatars based on unique identifiers (e.g., wallet addresses).
 * Uses the `boring-avatars` library for generation with pod brand colors by default.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Avatar.Root name={address}>
 *   <Avatar.Image />
 * </Avatar.Root>
 *
 * // With custom styling
 * <Avatar.Root name={address} size={48} variant="beam">
 *   <Avatar.Image className="rounded-lg shadow-md" />
 * </Avatar.Root>
 * ```
 */
export const Avatar = {
  Root: AvatarRoot,
  Image: AvatarImage,
  Fallback: AvatarFallback,
} as const;

export { AvatarRoot, AvatarImage, AvatarFallback };
