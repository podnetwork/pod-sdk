/**
 * @module wallet-avatar
 * @description Styled wallet avatar using boring-avatars
 */

import Avatar from "boring-avatars";
import { cn } from "./utils.js";

/** pod brand colors for avatars */
export const POD_AVATAR_COLORS = [
  "#00E599", // pod green
  "#1A1A2E", // dark navy
  "#16213E", // deep blue
  "#0F3460", // medium blue
  "#E94560", // accent pink/red
] as const;

export interface WalletAvatarProps {
  /** Ethereum address to generate avatar from */
  readonly address: string;
  /** Size of the avatar in pixels */
  readonly size?: number;
  /** Avatar variant style */
  readonly variant?: "pixel" | "beam" | "bauhaus" | "ring" | "sunset" | "marble";
  /** Custom colors array */
  readonly colors?: readonly string[];
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Styled wallet avatar component using boring-avatars.
 *
 * @example
 * ```tsx
 * <WalletAvatar address="0x1234..." size={40} />
 * ```
 */
export function WalletAvatar({
  address,
  size = 32,
  variant = "pixel",
  colors = POD_AVATAR_COLORS,
  className,
}: WalletAvatarProps) {
  return (
    <div
      className={cn("inline-flex shrink-0 rounded-full overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      <Avatar
        size={size}
        name={address}
        variant={variant}
        colors={colors as string[]}
        square={false}
      />
    </div>
  );
}

WalletAvatar.displayName = "WalletAvatar";
