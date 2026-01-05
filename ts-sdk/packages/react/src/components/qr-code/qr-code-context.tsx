/**
 * @module components/qr-code/qr-code-context
 * @description Context for QrCode compound component
 */

import { createContext, useContext } from "react";

/**
 * Error correction level for QR codes.
 * Higher levels allow more damage/obstruction (like logos) but increase size.
 * @category Components
 */
export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";

/**
 * Context value shared within QrCode compound component.
 * @category Components
 */
export interface QrCodeContextValue {
  /** The value encoded in the QR code */
  readonly value: string;
  /** Size of the QR code in pixels */
  readonly size: number;
  /** Error correction level */
  readonly level: ErrorCorrectionLevel;
  /** Foreground color */
  readonly fgColor: string;
  /** Background color */
  readonly bgColor: string;
}

/**
 * QrCode context.
 * @internal
 */
export const QrCodeContext = createContext<QrCodeContextValue | null>(null);
QrCodeContext.displayName = "QrCodeContext";

/**
 * Hook to access the QrCode context.
 *
 * @param componentName - Name of the component for error message
 * @throws Error if used outside QrCode.Root
 *
 * @internal
 */
export function useQrCodeContext(componentName: string): QrCodeContextValue {
  const context = useContext(QrCodeContext);
  if (context === null) {
    throw new Error(
      `<${componentName}> must be used within <QrCode.Root>. ` +
        `Wrap your component with <QrCode.Root value={address}>.`
    );
  }
  return context;
}
