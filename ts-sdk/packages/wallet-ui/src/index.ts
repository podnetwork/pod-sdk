/**
 * @module @podnetwork/wallet-ui
 * @description Styled wallet UI components built on @podnetwork/react headless primitives
 *
 * This package provides ready-to-use, styled wallet components for pod network
 * applications. It uses Tailwind CSS for styling and Radix UI for accessible
 * primitives.
 *
 * @example
 * ```tsx
 * import { ConnectWalletButton } from '@podnetwork/wallet-ui';
 * import { POD_CHRONOS_DEV_NETWORK } from '@podnetwork/wallet-browser';
 *
 * function App() {
 *   return (
 *     <PodProvider network="chronos-dev">
 *       <Header>
 *         <ConnectWalletButton network={POD_CHRONOS_DEV_NETWORK} />
 *       </Header>
 *     </PodProvider>
 *   );
 * }
 * ```
 */

export const VERSION = "0.1.0-dev.6" as const;

// Main components
export { ConnectWalletButton } from "./connect-wallet-button.js";
export type { ConnectWalletButtonProps } from "./connect-wallet-button.js";

export { WalletPopover } from "./wallet-popover.js";
export type { WalletPopoverProps } from "./wallet-popover.js";

export { WalletAvatar, POD_AVATAR_COLORS } from "./wallet-avatar.js";
export type { WalletAvatarProps } from "./wallet-avatar.js";

export { WalletQRCode } from "./wallet-qr-code.js";
export type { WalletQRCodeProps } from "./wallet-qr-code.js";

export { NetworkWarningButton, NetworkWarningBanner } from "./network-warning.js";
export type {
  NetworkWarningButtonProps,
  NetworkWarningBannerProps,
} from "./network-warning.js";

export { NoWalletModal } from "./no-wallet-modal.js";
export type { NoWalletModalProps } from "./no-wallet-modal.js";

// Primitives
export { Button, buttonVariants } from "./button.js";
export type { ButtonProps } from "./button.js";

export { ButtonGroup } from "./button-group.js";
export type { ButtonGroupProps } from "./button-group.js";

// Utilities
export { cn, truncateAddress } from "./utils.js";

// Icons
export {
  CopyIcon,
  CheckIcon,
  QRCodeIcon,
  DisconnectIcon,
  SwitchIcon,
  ChevronDownIcon,
  AlertIcon,
  CloseIcon,
  WalletIcon,
  LoaderIcon,
} from "./icons.js";

// Re-export network configs from wallet-browser for convenience
export {
  POD_DEV_NETWORK,
  POD_CHRONOS_DEV_NETWORK,
  addPodNetworkToWallet,
  switchToPodNetwork,
  isBrowserWalletAvailable,
  getCurrentChainId,
  isConnectedToPodNetwork,
} from "@podnetwork/wallet-browser";
export type { PodNetworkConfig, AddNetworkResult } from "@podnetwork/wallet-browser";
