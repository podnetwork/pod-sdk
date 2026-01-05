/**
 * @module wallet-popover
 * @description Wallet popover component with account management
 */

"use client";

import { useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn, truncateAddress } from "./utils.js";
import { Button } from "./button.js";
import { WalletAvatar, POD_AVATAR_COLORS } from "./wallet-avatar.js";
import { WalletQRCode } from "./wallet-qr-code.js";
import {
  CopyIcon,
  CheckIcon,
  QRCodeIcon,
  DisconnectIcon,
  SwitchIcon,
  ChevronDownIcon,
} from "./icons.js";

export interface WalletPopoverProps {
  /** Primary address to display */
  readonly address: string;
  /** Whether the popover is open */
  readonly open: boolean;
  /** Callback when open state changes */
  readonly onOpenChange: (open: boolean) => void;
  /** Callback when disconnect is clicked */
  readonly onDisconnect: () => void;
  /** List of available accounts */
  readonly accounts?: readonly string[];
  /** Currently active account */
  readonly activeAccount?: string | null;
  /** Callback when an account is selected */
  readonly onSelectAccount?: (address: string) => void;
  /** Callback to request accounts from wallet */
  readonly onRequestAccounts?: () => Promise<void>;
  /** Trigger element */
  readonly children: ReactNode;
  /** Additional CSS classes for the popover content */
  readonly className?: string;
}

/**
 * Wallet popover with account display, QR code, and account switching.
 *
 * @example
 * ```tsx
 * <WalletPopover
 *   address={address}
 *   open={open}
 *   onOpenChange={setOpen}
 *   onDisconnect={handleDisconnect}
 * >
 *   <button>Open Wallet</button>
 * </WalletPopover>
 * ```
 */
export function WalletPopover({
  address,
  open,
  onOpenChange,
  onDisconnect,
  accounts = [],
  activeAccount,
  onSelectAccount,
  onRequestAccounts,
  children,
  className,
}: WalletPopoverProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  const displayAddress = activeAccount ?? address;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  const handleToggleQR = () => {
    setShowQR(!showQR);
  };

  const handleToggleAccounts = () => {
    setShowAccounts(!showAccounts);
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-50 w-80 rounded-lg border bg-popover p-0 text-popover-foreground shadow-md outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
            (showQR || showAccounts) && "w-[320px]",
            className
          )}
        >
          <div className="space-y-4 p-4">
            {/* Header with avatar and address */}
            <div className="flex items-center gap-3">
              <WalletAvatar address={displayAddress} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Connected</p>
                <p className="text-xs font-mono text-muted-foreground truncate">
                  {displayAddress}
                </p>
              </div>
            </div>

            {/* QR Code (collapsible) */}
            {showQR && (
              <div className="flex justify-center">
                <WalletQRCode address={displayAddress} size={160} />
              </div>
            )}

            {/* Accounts section (collapsible) */}
            {showAccounts && accounts.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Available Accounts
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {accounts.map((acc) => {
                    const isActive =
                      acc.toLowerCase() === displayAddress.toLowerCase();
                    return (
                      <button
                        key={acc}
                        onClick={() => !isActive && onSelectAccount?.(acc)}
                        disabled={isActive}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 w-full text-left transition-colors",
                          isActive
                            ? "bg-accent/50 cursor-default"
                            : "text-muted-foreground hover:bg-accent/30"
                        )}
                      >
                        <WalletAvatar address={acc} size={20} />
                        <span
                          className={cn(
                            "text-xs font-mono flex-1 truncate",
                            isActive && "text-foreground"
                          )}
                        >
                          {truncateAddress(acc)}
                        </span>
                        {isActive && (
                          <span className="text-[10px] text-green-500 font-medium">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {onRequestAccounts && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={onRequestAccounts}
                  >
                    <SwitchIcon className="h-3 w-3 mr-2" />
                    Manage Accounts in Wallet
                  </Button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <CheckIcon className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-4 w-4" />
                    <span>Copy Address</span>
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={handleToggleQR}
              >
                <QRCodeIcon className="h-4 w-4" />
                <span>{showQR ? "Hide QR Code" : "Show QR Code"}</span>
              </Button>

              {accounts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={handleToggleAccounts}
                >
                  <span className="flex items-center gap-2">
                    <SwitchIcon className="h-4 w-4" />
                    <span>Accounts</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {accounts.length}
                    </span>
                    <ChevronDownIcon
                      className={cn(
                        "h-4 w-4 transition-transform",
                        showAccounts && "rotate-180"
                      )}
                    />
                  </span>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDisconnect}
              >
                <DisconnectIcon className="h-4 w-4" />
                <span>Disconnect</span>
              </Button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

WalletPopover.displayName = "WalletPopover";

export { POD_AVATAR_COLORS };
