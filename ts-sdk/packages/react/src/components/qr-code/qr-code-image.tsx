/**
 * @module components/qr-code/qr-code-image
 * @description Image component for QrCode compound component
 */

import { type HTMLAttributes, type Ref, useEffect, useState, type ComponentType } from "react";
import { Slot } from "../primitives/slot.js";
import { useQrCodeContext, type ErrorCorrectionLevel } from "./qr-code-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for QrCode.Image component.
 * @category Components
 */
export interface QrCodeImageProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** Ref to the element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * QRCodeSVG component type from qrcode.react.
 */
interface QRCodeSVGProps {
  value: string;
  size: number;
  level: ErrorCorrectionLevel;
  fgColor: string;
  bgColor: string;
  imageSettings?: {
    src: string;
    width: number;
    height: number;
    excavate?: boolean;
  };
}

/**
 * Cache for the qrcode.react component.
 */
let cachedQRCodeSVG: ComponentType<QRCodeSVGProps> | null = null;
let loadAttempted = false;
let loadError: Error | null = null;

/**
 * Dynamically load the qrcode.react package.
 * Returns the QRCodeSVG component or throws an error if not installed.
 */
function loadQRCodeSVG(): ComponentType<QRCodeSVGProps> {
  if (cachedQRCodeSVG != null) {
    return cachedQRCodeSVG;
  }

  if (loadError != null) {
    throw loadError;
  }

  if (loadAttempted) {
    throw new Error(
      'QrCode.Image requires the "qrcode.react" package. ' +
        "Install it with: pnpm add qrcode.react"
    );
  }

  loadAttempted = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const qrcodeReact = require("qrcode.react");
    cachedQRCodeSVG = qrcodeReact.QRCodeSVG as ComponentType<QRCodeSVGProps>;
    return cachedQRCodeSVG;
  } catch {
    loadError = new Error(
      'QrCode.Image requires the "qrcode.react" package. ' +
        "Install it with: pnpm add qrcode.react"
    );
    throw loadError;
  }
}

/**
 * Image component that renders the QR code.
 *
 * Renders a QR code based on the `value` prop from QrCode.Root.
 * Uses the `qrcode.react` library under the hood.
 *
 * **Important:** This component requires the `qrcode.react` package.
 * Install it with: `pnpm add qrcode.react`
 *
 * @example
 * ```tsx
 * <QrCode.Root value={address}>
 *   <QrCode.Image className="rounded-lg" />
 * </QrCode.Root>
 * ```
 */
export const QrCodeImage = ({
  asChild = false,
  className,
  ref,
  ...props
}: QrCodeImageProps): React.ReactNode => {
  const { value, size, level, fgColor, bgColor } = useQrCodeContext("QrCode.Image");
  const [QRCodeSVG, setQRCodeSVG] = useState<ComponentType<QRCodeSVGProps> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const QRComponent = loadQRCodeSVG();
      setQRCodeSVG(() => QRComponent);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  if (error != null) {
    throw error;
  }

  if (QRCodeSVG == null) {
    // Loading state - render empty placeholder with same dimensions
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        className={className}
        style={{ width: size, height: size }}
        data-loading="true"
        {...props}
      />
    );
  }

  const Comp = asChild ? Slot : "div";

  return (
    <Comp ref={ref} className={className} {...props}>
      <QRCodeSVG
        value={value}
        size={size}
        level={level}
        fgColor={fgColor}
        bgColor={bgColor}
      />
    </Comp>
  );
};

QrCodeImage.displayName = "QrCode.Image";
