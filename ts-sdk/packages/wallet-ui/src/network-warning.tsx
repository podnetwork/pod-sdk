/**
 * @module network-warning
 * @description Network warning components for incorrect network connection
 */

"use client";

import * as Popover from "@radix-ui/react-popover";
import type { PodNetworkConfig } from "@podnetwork/wallet-browser";
import { cn } from "./utils.js";
import { Button } from "./button.js";
import { ButtonGroup } from "./button-group.js";
import { AlertIcon } from "./icons.js";

interface NetworkInfoRowProps {
  readonly label: string;
  readonly value: string | number;
}

function NetworkInfoRow({ label, value }: NetworkInfoRowProps) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono truncate max-w-[180px]">{value}</span>
    </div>
  );
}

export interface NetworkWarningButtonProps {
  /** Current chain ID the wallet is connected to */
  readonly currentChainId: bigint;
  /** Expected network configuration */
  readonly network: PodNetworkConfig;
  /** Callback when "Switch Network" is clicked */
  readonly onSwitchNetwork?: () => void;
  /** Additional CSS classes */
  readonly className?: string | undefined;
}

/**
 * Compact network warning with button group.
 * Left button switches network, right button shows detailed info popover.
 *
 * @example
 * ```tsx
 * <NetworkWarningButton
 *   currentChainId={currentChainId}
 *   network={POD_CHRONOS_DEV_NETWORK}
 *   onSwitchNetwork={handleSwitch}
 * />
 * ```
 */
export function NetworkWarningButton({
  currentChainId,
  network,
  onSwitchNetwork,
  className,
}: NetworkWarningButtonProps) {
  const expectedChainId = BigInt(network.chainId);

  return (
    <ButtonGroup className={className}>
      <Button
        variant="outline"
        size="sm"
        onClick={onSwitchNetwork}
        className="border-yellow-500/50 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
      >
        Switch Network
      </Button>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-yellow-500/50 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 px-2"
            aria-label="View network details"
          >
            <AlertIcon className="h-4 w-4" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className={cn(
              "z-50 w-80 rounded-lg border bg-popover p-4 text-popover-foreground shadow-md outline-none",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
            )}
          >
            <div className="space-y-4">
              {/* Current Network Section */}
              <div>
                <h4 className="font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                  <AlertIcon className="h-4 w-4" />
                  Current Network
                </h4>
                <div className="space-y-1.5 rounded-md bg-yellow-500/10 p-3 border border-yellow-500/20">
                  <NetworkInfoRow
                    label="Chain ID"
                    value={currentChainId.toString()}
                  />
                  <NetworkInfoRow
                    label="Hex"
                    value={`0x${currentChainId.toString(16)}`}
                  />
                </div>
              </div>

              {/* Expected Network Section */}
              <div>
                <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                  Expected: {network.chainName}
                </h4>
                <div className="space-y-1.5 rounded-md bg-green-500/10 p-3 border border-green-500/20">
                  <NetworkInfoRow label="Name" value={network.chainName} />
                  <NetworkInfoRow
                    label="Chain ID"
                    value={expectedChainId.toString()}
                  />
                  <NetworkInfoRow
                    label="Currency"
                    value={`${network.nativeCurrency.symbol} (${network.nativeCurrency.name})`}
                  />
                  <NetworkInfoRow label="RPC" value={network.rpcUrl} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Click &quot;Switch Network&quot; to connect to {network.chainName}{" "}
                automatically.
              </p>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </ButtonGroup>
  );
}

NetworkWarningButton.displayName = "NetworkWarningButton";

export interface NetworkWarningBannerProps {
  /** Current chain ID the wallet is connected to */
  readonly currentChainId: bigint;
  /** Expected chain ID */
  readonly expectedChainId: bigint;
  /** Expected network name for display */
  readonly networkName?: string;
  /** Callback when "Switch Network" is clicked */
  readonly onSwitchNetwork?: () => void;
  /** Additional CSS classes */
  readonly className?: string;
}

/**
 * Full-width network warning banner.
 *
 * @example
 * ```tsx
 * <NetworkWarningBanner
 *   currentChainId={currentChainId}
 *   expectedChainId={BigInt(network.chainId)}
 *   networkName="Pod Network"
 *   onSwitchNetwork={handleSwitch}
 * />
 * ```
 */
export function NetworkWarningBanner({
  currentChainId,
  expectedChainId,
  networkName = "Pod Network",
  onSwitchNetwork,
  className,
}: NetworkWarningBannerProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3",
        className
      )}
    >
      <AlertIcon className="h-5 w-5 shrink-0 text-yellow-500" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-yellow-500">Wrong Network</p>
        <p className="text-muted-foreground">
          Your wallet is connected to chain {currentChainId.toString()}. Please
          switch to {networkName} (chain {expectedChainId.toString()}).
        </p>
      </div>
      {onSwitchNetwork && (
        <Button variant="outline" size="sm" onClick={onSwitchNetwork} className="shrink-0">
          Switch Network
        </Button>
      )}
    </div>
  );
}

NetworkWarningBanner.displayName = "NetworkWarningBanner";
