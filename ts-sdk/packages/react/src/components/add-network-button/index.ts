/**
 * @module components/add-network-button
 * @description AddNetworkButton compound component for adding Pod Network to browser wallets
 *
 * The AddNetworkButton component provides a flexible way to add Pod Network
 * to browser wallets like MetaMask. It handles the EIP-3085 flow and provides
 * status feedback to users.
 *
 * @example
 * ```tsx
 * import { AddNetworkButton, POD_DEV_NETWORK } from '@podnetwork/react';
 *
 * function NetworkButton() {
 *   return (
 *     <AddNetworkButton.Root network={POD_DEV_NETWORK}>
 *       <AddNetworkButton.Trigger className="btn">
 *         Add Pod Network
 *       </AddNetworkButton.Trigger>
 *       <AddNetworkButton.Status className="status-text" />
 *     </AddNetworkButton.Root>
 *   );
 * }
 * ```
 */

import { AddNetworkButtonRoot } from "./add-network-root.js";
import { AddNetworkButtonTrigger } from "./add-network-trigger.js";
import { AddNetworkButtonStatus } from "./add-network-status.js";

export type { AddNetworkButtonContextValue, AddNetworkStatus } from "./add-network-context.js";
export { useAddNetworkButtonContext } from "./add-network-context.js";

export type { AddNetworkButtonRootProps } from "./add-network-root.js";
export type { AddNetworkButtonTriggerProps } from "./add-network-trigger.js";
export type { AddNetworkButtonStatusProps } from "./add-network-status.js";

/**
 * AddNetworkButton compound component.
 *
 * @example
 * ```tsx
 * <AddNetworkButton.Root network={POD_DEV_NETWORK}>
 *   <AddNetworkButton.Trigger>Add Pod Network</AddNetworkButton.Trigger>
 *   <AddNetworkButton.Status />
 * </AddNetworkButton.Root>
 * ```
 */
export const AddNetworkButton = {
  Root: AddNetworkButtonRoot,
  Trigger: AddNetworkButtonTrigger,
  Status: AddNetworkButtonStatus,
} as const;

export { AddNetworkButtonRoot, AddNetworkButtonTrigger, AddNetworkButtonStatus };
