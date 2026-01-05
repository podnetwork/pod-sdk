/**
 * @module connect-wallet-button
 * @description Main wallet connection button with all states
 */

"use client";

import { useState } from "react";
import {
  useWallet,
  useNetworkValidation,
  useWalletAccounts,
  WalletAccountsProvider,
} from "@podnetwork/react";
import {
  isBrowserWalletAvailable,
  addPodNetworkToWallet,
  switchToPodNetwork,
  type PodNetworkConfig,
} from "@podnetwork/wallet-browser";
import { cn, truncateAddress } from "./utils.js";
import { Button } from "./button.js";
import { WalletAvatar } from "./wallet-avatar.js";
import { WalletPopover } from "./wallet-popover.js";
import { NetworkWarningButton } from "./network-warning.js";
import { NoWalletModal } from "./no-wallet-modal.js";
import { LoaderIcon } from "./icons.js";

export interface ConnectWalletButtonProps {
  /** Network configuration to use */
  readonly network: PodNetworkConfig;
  /** Additional CSS classes */
  readonly className?: string;
  /** Button variant when disconnected */
  readonly variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  readonly size?: "default" | "sm" | "lg";
}

/**
 * Internal wallet button that handles all wallet states.
 */
function WalletButtonInner({
  network,
  className,
  variant = "outline",
  size = "sm",
}: ConnectWalletButtonProps) {
  const { status, address, connect, disconnect } = useWallet();
  const { isCorrectNetwork, currentChainId } = useNetworkValidation({ network });
  const { accounts, activeAccount, selectAccount, requestAccounts } = useWalletAccounts();
  const [showNoWallet, setShowNoWallet] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const displayAddress = activeAccount ?? address;

  const handleConnect = async () => {
    if (!isBrowserWalletAvailable()) {
      setShowNoWallet(true);
      return;
    }

    try {
      await addPodNetworkToWallet(network);
      await connect({ type: "browser" });
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setPopoverOpen(false);
  };

  const handleSwitchNetwork = async () => {
    try {
      await addPodNetworkToWallet(network);
      await switchToPodNetwork(network);
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  if (status === "connected" && displayAddress) {
    if (!isCorrectNetwork && currentChainId !== null) {
      return (
        <NetworkWarningButton
          currentChainId={currentChainId}
          network={network}
          onSwitchNetwork={handleSwitchNetwork}
          className={className}
        />
      );
    }

    return (
      <>
        <WalletPopover
          address={displayAddress}
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          onDisconnect={handleDisconnect}
          accounts={accounts}
          activeAccount={activeAccount}
          onSelectAccount={selectAccount}
          onRequestAccounts={requestAccounts}
        >
          <button
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2",
              "bg-secondary hover:bg-secondary/80",
              "transition-all",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              className
            )}
            aria-label="Open wallet menu"
          >
            <WalletAvatar address={displayAddress} size={24} />
            <span className="font-mono text-sm">{truncateAddress(displayAddress)}</span>
          </button>
        </WalletPopover>
        <NoWalletModal isOpen={showNoWallet} onClose={() => setShowNoWallet(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleConnect}
        disabled={status === "connecting"}
        variant={variant}
        size={size}
        className={className}
      >
        {status === "connecting" ? (
          <>
            <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect Wallet"
        )}
      </Button>
      <NoWalletModal isOpen={showNoWallet} onClose={() => setShowNoWallet(false)} />
    </>
  );
}

/**
 * Main wallet connection button component.
 *
 * Shows "Connect Wallet" when disconnected, displays connected wallet avatar
 * and address when connected. Clicking opens a popover with wallet actions.
 *
 * Automatically wraps in WalletAccountsProvider if not already in one.
 *
 * @example
 * ```tsx
 * import { ConnectWalletButton, POD_CHRONOS_DEV_NETWORK } from '@podnetwork/wallet-ui';
 *
 * function Header() {
 *   return (
 *     <nav>
 *       <ConnectWalletButton network={POD_CHRONOS_DEV_NETWORK} />
 *     </nav>
 *   );
 * }
 * ```
 */
export function ConnectWalletButton(props: ConnectWalletButtonProps) {
  return (
    <WalletAccountsProvider>
      <WalletButtonInner {...props} />
    </WalletAccountsProvider>
  );
}

ConnectWalletButton.displayName = "ConnectWalletButton";
