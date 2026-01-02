/**
 * @module utils
 * @description Utility functions for pod SDK React components
 */

export { truncateHash, isValidHash, isValidAddress, isValidTxHash } from "./truncate-hash.js";
export type { TruncateHashOptions } from "./truncate-hash.js";

export { copyToClipboard, isClipboardAvailable } from "./clipboard.js";

export { isSSR, isWebSocketAvailable, browserOnly } from "./ssr.js";

export { formatTokenAmount, parseTokenAmount } from "./format-token.js";
export type { FormatTokenAmountOptions } from "./format-token.js";

export { formatTimestamp, relativeTime, formatDuration } from "./format-timestamp.js";
export type { FormatTimestampOptions, FormatDurationOptions } from "./format-timestamp.js";

export { srOnlyStyles } from "./styles.js";
