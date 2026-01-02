/**
 * @module components/address
 * @description Address compound component for displaying Ethereum addresses
 *
 * @example
 * ```tsx
 * import { Address } from '@podnetwork/react';
 *
 * function WalletAddress({ address }) {
 *   return (
 *     <Address.Root value={address} truncate="middle">
 *       <Address.Truncated className="font-mono" />
 *       <Address.Copy />
 *     </Address.Root>
 *   );
 * }
 * ```
 */

import { AddressRoot } from "./address-root.js";
import { AddressTruncated } from "./address-truncated.js";
import { AddressCopy } from "./address-copy.js";

export type { AddressContextValue } from "./address-context.js";
export type { AddressRootProps } from "./address-root.js";
export type { AddressTruncatedProps } from "./address-truncated.js";
export type { AddressCopyProps } from "./address-copy.js";

/**
 * Address compound component.
 *
 * @example
 * ```tsx
 * <Address.Root value="0x1234567890abcdef...">
 *   <Address.Truncated />
 *   <Address.Copy />
 * </Address.Root>
 * ```
 */
export const Address = {
  Root: AddressRoot,
  Truncated: AddressTruncated,
  Copy: AddressCopy,
} as const;

export { AddressRoot, AddressTruncated, AddressCopy };
