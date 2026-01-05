/**
 * @module components/avatar/avatar-context
 * @description Context for Avatar compound component
 */

import { createContext, useContext } from "react";

/**
 * Avatar variant styles.
 * @category Components
 */
export type AvatarVariant = "marble" | "beam" | "pixel" | "sunset" | "ring" | "bauhaus";

/**
 * pod brand color palette for avatars.
 * Green-dominant with orange accents.
 * @category Components
 */
export const POD_AVATAR_COLORS = [
  // Green shades (8)
  "#DCFCE7", // Green 50 - very light mint
  "#BBF7D0", // Green 100 - light green
  "#86EFAC", // Green 200 - soft green
  "#4ADE80", // Green 300 - medium green
  "#22C55E", // Green 400 - pod green (primary)
  "#16A34A", // Green 500 - rich green
  "#15803D", // Green 600 - forest green
  "#14532D", // Green 800 - dark green
  // Orange accents (2)
  "#FB923C", // Orange 400
  "#EA580C", // Orange 600
] as const;

/**
 * Context value shared within Avatar compound component.
 * @category Components
 */
export interface AvatarContextValue {
  /** Unique name for deterministic generation (e.g., wallet address) */
  readonly name: string;
  /** Size in pixels */
  readonly size: number;
  /** Avatar variant style */
  readonly variant: AvatarVariant;
  /** Color palette for avatar generation */
  readonly colors: readonly string[];
}

/**
 * Avatar context.
 * @internal
 */
export const AvatarContext = createContext<AvatarContextValue | null>(null);
AvatarContext.displayName = "AvatarContext";

/**
 * Hook to access the Avatar context.
 *
 * @param componentName - Name of the component for error message
 * @throws Error if used outside Avatar.Root
 *
 * @internal
 */
export function useAvatarContext(componentName: string): AvatarContextValue {
  const context = useContext(AvatarContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <Avatar.Root>. ` +
        `Wrap your component with <Avatar.Root name={address}>.`
    );
  }
  return context;
}
