/**
 * @module components/qr-code
 * @description QR code compound component for displaying scannable codes
 *
 * The QrCode component provides a flexible way to display QR codes
 * with optional logo overlays.
 *
 * **Important:** The QrCode.Image component requires the `qrcode.react` package.
 * Install it with: `pnpm add qrcode.react`
 *
 * @example
 * ```tsx
 * import { QrCode } from '@podnetwork/react';
 *
 * function WalletQRCode({ address }) {
 *   return (
 *     <QrCode.Root value={address} size={200} level="H">
 *       <QrCode.Image className="rounded-lg" />
 *       <QrCode.Logo src="/pod-logo.svg" />
 *     </QrCode.Root>
 *   );
 * }
 * ```
 */

import { QrCodeRoot } from "./qr-code-root.js";
import { QrCodeImage } from "./qr-code-image.js";
import { QrCodeLogo } from "./qr-code-logo.js";

export type { QrCodeContextValue, ErrorCorrectionLevel } from "./qr-code-context.js";
export { useQrCodeContext } from "./qr-code-context.js";
export type { QrCodeRootProps } from "./qr-code-root.js";
export type { QrCodeImageProps } from "./qr-code-image.js";
export type { QrCodeLogoProps } from "./qr-code-logo.js";

/**
 * QrCode compound component.
 *
 * Displays QR codes with optional logo overlays.
 * Uses the `qrcode.react` library for generation.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <QrCode.Root value={address}>
 *   <QrCode.Image />
 * </QrCode.Root>
 *
 * // With logo (use level="H" for high error correction)
 * <QrCode.Root value={address} level="H">
 *   <QrCode.Image />
 *   <QrCode.Logo src="/logo.svg" />
 * </QrCode.Root>
 * ```
 */
export const QrCode = {
  Root: QrCodeRoot,
  Image: QrCodeImage,
  Logo: QrCodeLogo,
} as const;

export { QrCodeRoot, QrCodeImage, QrCodeLogo };
