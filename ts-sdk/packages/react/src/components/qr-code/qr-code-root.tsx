/**
 * @module components/qr-code/qr-code-root
 * @description Root component for QrCode compound component
 */

import { useMemo, type HTMLAttributes, type Ref } from "react";
import { Slot } from "../primitives/slot.js";
import {
  QrCodeContext,
  type QrCodeContextValue,
  type ErrorCorrectionLevel,
} from "./qr-code-context.js";
import type { BaseComponentProps } from "../../types.js";

/**
 * Props for QrCode.Root component.
 * @category Components
 */
export interface QrCodeRootProps extends BaseComponentProps, HTMLAttributes<HTMLDivElement> {
  /** The value to encode in the QR code (e.g., wallet address, URL) */
  readonly value: string;
  /** Size of the QR code in pixels. Default: 200 */
  readonly size?: number;
  /**
   * Error correction level.
   * - L: ~7% correction
   * - M: ~15% correction (default)
   * - Q: ~25% correction
   * - H: ~30% correction (use for QR codes with logos)
   * Default: 'H' (recommended when using logos)
   */
  readonly level?: ErrorCorrectionLevel;
  /** Foreground color. Default: '#000000' */
  readonly fgColor?: string;
  /** Background color. Default: 'transparent' */
  readonly bgColor?: string;
  /** Child components */
  readonly children?: React.ReactNode;
  /** Ref to the root element */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * Root component for the QrCode compound component.
 *
 * Provides context for child components and renders the container element.
 *
 * **Important:** The QrCode.Image component requires the `qrcode.react` package.
 * Install it with: `pnpm add qrcode.react`
 *
 * @example
 * ```tsx
 * <QrCode.Root value={address} size={200}>
 *   <QrCode.Image />
 * </QrCode.Root>
 * ```
 *
 * @example
 * ```tsx
 * // With logo overlay
 * <QrCode.Root value={address} level="H">
 *   <QrCode.Image />
 *   <QrCode.Logo src="/pod-logo.svg" />
 * </QrCode.Root>
 * ```
 *
 * @example
 * ```tsx
 * // Custom styling
 * <QrCode.Root value={address} fgColor="#22C55E" bgColor="#FFFFFF">
 *   <QrCode.Image className="rounded-lg" />
 * </QrCode.Root>
 * ```
 */
export const QrCodeRoot = ({
  value,
  size = 200,
  level = "H",
  fgColor = "#000000",
  bgColor = "transparent",
  asChild = false,
  className,
  children,
  ref,
  style,
  ...props
}: QrCodeRootProps): React.ReactNode => {
  const contextValue = useMemo<QrCodeContextValue>(
    () => ({
      value,
      size,
      level,
      fgColor,
      bgColor,
    }),
    [value, size, level, fgColor, bgColor]
  );

  const Comp = asChild ? Slot : "div";

  return (
    <QrCodeContext.Provider value={contextValue}>
      <Comp
        ref={ref}
        className={className}
        style={{
          position: "relative",
          width: size,
          height: size,
          ...style,
        }}
        data-level={level}
        {...props}
      >
        {children}
      </Comp>
    </QrCodeContext.Provider>
  );
};

QrCodeRoot.displayName = "QrCode.Root";
