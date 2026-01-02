/**
 * @module utils/styles
 * @description Reusable style constants for React components
 */

import type { CSSProperties } from "react";

/**
 * Screen-reader-only styles that visually hide content while keeping it
 * accessible to assistive technologies.
 *
 * @example
 * ```tsx
 * <span style={srOnlyStyles}>Full text for screen readers</span>
 * <span aria-hidden="true">Visible truncated text</span>
 * ```
 */
export const srOnlyStyles: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};
