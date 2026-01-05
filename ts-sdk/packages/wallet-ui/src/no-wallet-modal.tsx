/**
 * @module no-wallet-modal
 * @description Modal shown when no browser wallet is detected
 */

"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "./utils.js";
import { Button } from "./button.js";
import { CloseIcon, WalletIcon } from "./icons.js";

export interface NoWalletModalProps {
  /** Whether the modal is open */
  readonly isOpen: boolean;
  /** Callback when modal should close */
  readonly onClose: () => void;
  /** Custom title */
  readonly title?: string;
  /** Custom description */
  readonly description?: string;
  /** Custom button text */
  readonly buttonText?: string;
}

/**
 * Modal displayed when no browser wallet extension is detected.
 *
 * @example
 * ```tsx
 * <NoWalletModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 * />
 * ```
 */
export function NoWalletModal({
  isOpen,
  onClose,
  title = "Wallet Not Detected",
  description = "To connect your wallet, you need a browser wallet extension installed. Browser wallets like MetaMask allow you to interact with blockchain applications securely.",
  buttonText = "Got it",
}: NoWalletModalProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/50",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-xl border bg-background p-6 shadow-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          <Dialog.Close
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <CloseIcon className="h-4 w-4" />
          </Dialog.Close>

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <WalletIcon className="h-6 w-6 text-muted-foreground" />
            </div>

            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>

            <Dialog.Description className="text-sm text-muted-foreground">
              {description}
            </Dialog.Description>

            <div className="mt-2 w-full">
              <Button onClick={onClose} className="w-full">
                {buttonText}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

NoWalletModal.displayName = "NoWalletModal";
