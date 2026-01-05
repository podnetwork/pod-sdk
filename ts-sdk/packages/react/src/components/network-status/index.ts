/**
 * @module components/network-status
 * @description NetworkStatus compound component for displaying network validation
 *
 * The NetworkStatus component provides a flexible way to display and manage
 * network connection status for browser wallets.
 *
 * @example
 * ```tsx
 * import { NetworkStatus } from '@podnetwork/react';
 *
 * function NetworkGuard({ children }) {
 *   return (
 *     <NetworkStatus.Root>
 *       {({ isCorrectNetwork }) => (
 *         isCorrectNetwork ? children : (
 *           <div>
 *             <NetworkStatus.Badge />
 *             <span>Please switch to </span>
 *             <NetworkStatus.Name />
 *             <NetworkStatus.SwitchButton />
 *           </div>
 *         )
 *       )}
 *     </NetworkStatus.Root>
 *   );
 * }
 * ```
 */

import { NetworkStatusRoot } from "./network-status-root.js";
import { NetworkStatusBadge } from "./network-status-badge.js";
import { NetworkStatusName } from "./network-status-name.js";
import { NetworkStatusChainId } from "./network-status-chain-id.js";
import { NetworkStatusSwitchButton } from "./network-status-switch-button.js";

export type { NetworkStatusContextValue } from "./network-status-context.js";
export { useNetworkStatusContext } from "./network-status-context.js";
export type { NetworkStatusRootProps } from "./network-status-root.js";
export type { NetworkStatusBadgeProps } from "./network-status-badge.js";
export type { NetworkStatusNameProps } from "./network-status-name.js";
export type { NetworkStatusChainIdProps } from "./network-status-chain-id.js";
export type { NetworkStatusSwitchButtonProps } from "./network-status-switch-button.js";

/**
 * NetworkStatus compound component.
 *
 * Displays network validation status and provides controls for switching networks.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <NetworkStatus.Root>
 *   <NetworkStatus.Badge />
 *   <NetworkStatus.Name />
 * </NetworkStatus.Root>
 *
 * // With switch button
 * <NetworkStatus.Root>
 *   <NetworkStatus.Badge />
 *   <NetworkStatus.SwitchButton>Switch Network</NetworkStatus.SwitchButton>
 * </NetworkStatus.Root>
 * ```
 */
export const NetworkStatus = {
  Root: NetworkStatusRoot,
  Badge: NetworkStatusBadge,
  Name: NetworkStatusName,
  ChainId: NetworkStatusChainId,
  SwitchButton: NetworkStatusSwitchButton,
} as const;

export {
  NetworkStatusRoot,
  NetworkStatusBadge,
  NetworkStatusName,
  NetworkStatusChainId,
  NetworkStatusSwitchButton,
};
