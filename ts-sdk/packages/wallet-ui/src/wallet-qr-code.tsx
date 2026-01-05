/**
 * @module wallet-qr-code
 * @description Styled QR code for wallet addresses
 */

import { QRCodeSVG } from "qrcode.react";
import { cn } from "./utils.js";

export interface WalletQRCodeProps {
  /** Ethereum address to encode in the QR code */
  readonly address: string;
  /** Size of the QR code in pixels */
  readonly size?: number;
  /** Background color */
  readonly bgColor?: string;
  /** Foreground color */
  readonly fgColor?: string;
  /** Error correction level */
  readonly level?: "L" | "M" | "Q" | "H";
  /** Additional CSS classes for the container */
  readonly className?: string;
}

/**
 * Styled QR code component for displaying wallet addresses.
 *
 * @example
 * ```tsx
 * <WalletQRCode address="0x1234..." size={200} />
 * ```
 */
export function WalletQRCode({
  address,
  size = 160,
  bgColor = "transparent",
  fgColor = "currentColor",
  level = "M",
  className,
}: WalletQRCodeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-lg p-2 bg-white",
        className
      )}
    >
      <QRCodeSVG
        value={address}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level={level}
        includeMargin={false}
      />
    </div>
  );
}

WalletQRCode.displayName = "WalletQRCode";
