/**
 * @module components/qr-code/qr-code-logo
 * @description Logo overlay component for QrCode compound component
 */

import { type Ref, type ImgHTMLAttributes } from "react";
import { Slot } from "../primitives/slot.js";
import { useQrCodeContext } from "./qr-code-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Default logo width as a percentage of QR code size.
 */
const DEFAULT_LOGO_RATIO = 0.35;

/**
 * Props for QrCode.Logo component.
 * @category Components
 */
export interface QrCodeLogoProps
  extends BaseComponentProps,
    Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> {
  /** Logo image source URL */
  readonly src: string;
  /**
   * Logo width as a percentage of QR code size (0-1).
   * Default: 0.35 (35%)
   */
  readonly ratio?: number;
  /**
   * Logo aspect ratio (width/height).
   * If not provided, the image's natural aspect ratio is used.
   */
  readonly aspectRatio?: number;
  /** Ref to the image element */
  readonly ref?: Ref<HTMLImageElement>;
}

/**
 * Logo overlay component for the QR code.
 *
 * Renders a logo image centered over the QR code. Use with error correction
 * level "H" (high) to ensure the QR code remains scannable.
 *
 * @example
 * ```tsx
 * <QrCode.Root value={address} level="H">
 *   <QrCode.Image />
 *   <QrCode.Logo src="/pod-logo.svg" />
 * </QrCode.Root>
 * ```
 *
 * @example
 * ```tsx
 * // With custom size and aspect ratio
 * <QrCode.Root value={address} level="H">
 *   <QrCode.Image />
 *   <QrCode.Logo
 *     src="/logo.png"
 *     ratio={0.4}
 *     aspectRatio={16/9}
 *   />
 * </QrCode.Root>
 * ```
 */
export const QrCodeLogo = ({
  src,
  ratio = DEFAULT_LOGO_RATIO,
  aspectRatio,
  asChild = false,
  className,
  ref,
  style,
  alt = "Logo",
  ...props
}: QrCodeLogoProps): React.ReactNode => {
  const { size } = useQrCodeContext("QrCode.Logo");

  const logoWidth = Math.round(size * ratio);
  // If aspect ratio is provided, calculate height; otherwise, let browser handle it
  const logoHeight = aspectRatio != null ? Math.round(logoWidth / aspectRatio) : undefined;

  const Comp = asChild ? Slot : "img";

  return (
    <Comp
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: logoWidth,
        height: logoHeight,
        ...style,
      }}
      {...props}
    />
  );
};

QrCodeLogo.displayName = "QrCode.Logo";
