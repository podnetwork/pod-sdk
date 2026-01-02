/**
 * @module errors/codes
 * @description Unified error code catalog for pod SDK
 */

/**
 * Error severity levels.
 */
export type PodErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Error code categories.
 */
export type PodErrorCategory =
  | "NETWORK"
  | "FUNDING"
  | "EXECUTION"
  | "WALLET"
  | "AUCTION"
  | "ORDERBOOK";

/**
 * Metadata for an error code.
 */
export interface ErrorCodeMetadata {
  /** Human-readable name */
  readonly name: string;
  /** Error category */
  readonly category: PodErrorCategory;
  /** Brief description */
  readonly description: string;
  /** Whether this error is retryable */
  readonly retryable: boolean;
  /** Error severity */
  readonly severity: PodErrorSeverity;
  /** Actionable suggestion for resolving the error */
  readonly suggestion: string;
}

/**
 * All pod SDK error codes.
 *
 * Code ranges by category:
 * - 1xxx: Network errors (connection, timeout, DNS)
 * - 2xxx: Funding errors (faucet, insufficient funds, gas)
 * - 3xxx: Execution errors (transaction, validation, RPC, websocket, contract)
 * - 4xxx: Wallet errors (keys, signing, browser wallet)
 * - 5xxx: Auction errors
 * - 6xxx: Orderbook errors
 */
export const POD_ERRORS = {
  // ============================================
  // Network Errors (1xxx)
  // ============================================

  /** Failed to establish connection to endpoint */
  NETWORK_CONNECTION_FAILED: "POD_1001",
  /** Request exceeded timeout limit */
  NETWORK_TIMEOUT: "POD_1002",
  /** Connection was reset by peer */
  NETWORK_CONNECTION_RESET: "POD_1003",
  /** DNS resolution failed */
  NETWORK_DNS_FAILURE: "POD_1004",

  // ============================================
  // Funding Errors (2xxx)
  // ============================================

  /** Account has insufficient funds for transaction */
  INSUFFICIENT_FUNDS: "POD_2001",
  /** Gas limit is too low for transaction */
  GAS_TOO_LOW: "POD_2002",
  /** Transaction gas price is too low */
  UNDERPRICED: "POD_2003",
  /** Replacement transaction gas price is too low */
  REPLACEMENT_UNDERPRICED: "POD_2004",
  /** Faucet rate limit exceeded */
  FAUCET_RATE_LIMITED: "POD_2010",
  /** Faucet service is unavailable */
  FAUCET_UNAVAILABLE: "POD_2011",
  /** Faucet request failed */
  FAUCET_REQUEST_FAILED: "POD_2012",

  // ============================================
  // Execution Errors (3xxx)
  // ============================================

  // Transaction errors (3001-3009)
  /** Transaction not confirmed within timeout */
  TX_CONFIRMATION_TIMEOUT: "POD_3001",
  /** Transaction polling attempts exhausted */
  TX_POLLING_TIMEOUT: "POD_3002",
  /** Transaction execution reverted */
  TX_REVERTED: "POD_3003",
  /** Transaction nonce is too low (already used) */
  NONCE_TOO_LOW: "POD_3004",
  /** Transaction nonce is too high */
  NONCE_TOO_HIGH: "POD_3005",
  /** Transaction already in mempool */
  TX_ALREADY_KNOWN: "POD_3006",

  // Validation errors (3010-3019)
  /** Required parameter is missing */
  MISSING_PARAMETER: "POD_3010",
  /** Parameter has invalid value or format */
  INVALID_PARAMETER: "POD_3011",
  /** Schema validation failed */
  VALIDATION_FAILED: "POD_3012",

  // RPC errors (3020-3029)
  /** Invalid or malformed RPC response */
  RPC_INVALID_RESPONSE: "POD_3020",
  /** RPC method not found */
  RPC_METHOD_NOT_FOUND: "POD_3021",
  /** Invalid RPC parameters */
  RPC_INVALID_PARAMS: "POD_3022",
  /** RPC internal server error */
  RPC_INTERNAL_ERROR: "POD_3023",
  /** RPC JSON parse error */
  RPC_PARSE_ERROR: "POD_3024",

  // Contract errors (3030-3039)
  /** Smart contract execution reverted */
  CONTRACT_REVERT: "POD_3030",
  /** Failed to decode contract response */
  CONTRACT_DECODE_FAILED: "POD_3031",

  // WebSocket errors (3040-3049)
  /** WebSocket connection failed */
  WS_CONNECTION_FAILED: "POD_3040",
  /** Failed to send WebSocket message */
  WS_SEND_ERROR: "POD_3041",
  /** Failed to receive WebSocket message */
  WS_RECEIVE_ERROR: "POD_3042",
  /** WebSocket server error */
  WS_SERVER_ERROR: "POD_3043",
  /** WebSocket subscription limit exceeded */
  WS_SUBSCRIPTION_LIMIT: "POD_3044",
  /** WebSocket subscription failed */
  WS_SUBSCRIPTION_FAILED: "POD_3045",
  /** WebSocket not connected */
  WS_NOT_CONNECTED: "POD_3046",

  // ============================================
  // Wallet Errors (4xxx)
  // ============================================

  /** Invalid private key format */
  WALLET_INVALID_KEY: "POD_4001",
  /** Invalid mnemonic phrase */
  WALLET_INVALID_MNEMONIC: "POD_4002",
  /** HD wallet derivation failed */
  WALLET_DERIVATION_ERROR: "POD_4003",
  /** Keystore operation failed */
  WALLET_KEYSTORE_ERROR: "POD_4004",
  /** Invalid keystore password */
  WALLET_INVALID_PASSWORD: "POD_4005",
  /** Transaction signing failed */
  WALLET_SIGNING_FAILED: "POD_4006",
  /** Browser wallet not connected */
  WALLET_NOT_CONNECTED: "POD_4007",
  /** Wallet connected to wrong chain */
  WALLET_CHAIN_MISMATCH: "POD_4008",
  /** User rejected wallet request */
  WALLET_USER_REJECTED: "POD_4009",

  // ============================================
  // Auction Errors (5xxx)
  // ============================================

  /** Auction not found */
  AUCTION_NOT_FOUND: "POD_5001",
  /** Auction deadline timeout */
  AUCTION_TIMEOUT: "POD_5002",
  /** Auction has ended */
  AUCTION_ENDED: "POD_5003",
  /** Bid amount too low */
  BID_TOO_LOW: "POD_5004",
  /** Failed to decode auction response */
  AUCTION_DECODE_FAILED: "POD_5005",

  // ============================================
  // Orderbook Errors (6xxx)
  // ============================================

  /** Orderbook not found */
  ORDERBOOK_NOT_FOUND: "POD_6001",
  /** Invalid order parameters */
  ORDER_INVALID: "POD_6002",
  /** Failed to decode orderbook response */
  ORDERBOOK_DECODE_FAILED: "POD_6003",

  // ============================================
  // Unknown Error (0xxx)
  // ============================================

  /** Unknown or unclassified error */
  UNKNOWN: "POD_0001",
} as const;

/**
 * Type for all pod error codes.
 */
export type PodErrorCode = (typeof POD_ERRORS)[keyof typeof POD_ERRORS];

/**
 * Metadata for all error codes.
 * Used by error lookup CLI and documentation generation.
 */
export const ERROR_CODE_METADATA: Record<PodErrorCode, ErrorCodeMetadata> = {
  // Network errors
  [POD_ERRORS.NETWORK_CONNECTION_FAILED]: {
    name: "CONNECTION_FAILED",
    category: "NETWORK",
    description: "Failed to establish connection to endpoint",
    retryable: true,
    severity: "error",
    suggestion: "Check your network connection and verify the RPC URL is correct.",
  },
  [POD_ERRORS.NETWORK_TIMEOUT]: {
    name: "TIMEOUT",
    category: "NETWORK",
    description: "Request exceeded timeout limit",
    retryable: true,
    severity: "warning",
    suggestion:
      "The request took too long. Try increasing the timeout or check if the server is under heavy load.",
  },
  [POD_ERRORS.NETWORK_CONNECTION_RESET]: {
    name: "CONNECTION_RESET",
    category: "NETWORK",
    description: "Connection was reset by peer",
    retryable: true,
    severity: "error",
    suggestion: "The connection was unexpectedly closed. This may be temporary - try again.",
  },
  [POD_ERRORS.NETWORK_DNS_FAILURE]: {
    name: "DNS_FAILURE",
    category: "NETWORK",
    description: "DNS resolution failed",
    retryable: true,
    severity: "error",
    suggestion:
      "Could not resolve the hostname. Verify the URL is correct and your DNS is working.",
  },

  // Funding errors
  [POD_ERRORS.INSUFFICIENT_FUNDS]: {
    name: "INSUFFICIENT_FUNDS",
    category: "FUNDING",
    description: "Account has insufficient funds for transaction",
    retryable: false,
    severity: "error",
    suggestion:
      "Your account does not have enough funds. Request tokens from the faucet or transfer funds to this address.",
  },
  [POD_ERRORS.GAS_TOO_LOW]: {
    name: "GAS_TOO_LOW",
    category: "FUNDING",
    description: "Gas limit is too low for transaction",
    retryable: false,
    severity: "error",
    suggestion: "The gas limit is insufficient. Use estimateGas() to get the required gas limit.",
  },
  [POD_ERRORS.UNDERPRICED]: {
    name: "UNDERPRICED",
    category: "FUNDING",
    description: "Transaction gas price is too low",
    retryable: true,
    severity: "warning",
    suggestion:
      "The gas price is below the minimum. Use getGasPrice() to get the current gas price.",
  },
  [POD_ERRORS.REPLACEMENT_UNDERPRICED]: {
    name: "REPLACEMENT_UNDERPRICED",
    category: "FUNDING",
    description: "Replacement transaction gas price is too low",
    retryable: true,
    severity: "warning",
    suggestion: "To replace a pending transaction, the new gas price must be at least 10% higher.",
  },
  [POD_ERRORS.FAUCET_RATE_LIMITED]: {
    name: "FAUCET_RATE_LIMITED",
    category: "FUNDING",
    description: "Faucet rate limit exceeded",
    retryable: true,
    severity: "warning",
    suggestion: "You have exceeded the faucet rate limit. Please wait before requesting again.",
  },
  [POD_ERRORS.FAUCET_UNAVAILABLE]: {
    name: "FAUCET_UNAVAILABLE",
    category: "FUNDING",
    description: "Faucet service is unavailable",
    retryable: true,
    severity: "error",
    suggestion: "The faucet service is temporarily unavailable. Please try again later.",
  },
  [POD_ERRORS.FAUCET_REQUEST_FAILED]: {
    name: "FAUCET_REQUEST_FAILED",
    category: "FUNDING",
    description: "Faucet request failed",
    retryable: false,
    severity: "error",
    suggestion: "The faucet request could not be completed. Check the address and try again.",
  },

  // Execution errors - Transaction
  [POD_ERRORS.TX_CONFIRMATION_TIMEOUT]: {
    name: "TX_CONFIRMATION_TIMEOUT",
    category: "EXECUTION",
    description: "Transaction not confirmed within timeout",
    retryable: false,
    severity: "warning",
    suggestion:
      "The transaction was submitted but not confirmed in time. Check the transaction status using the hash.",
  },
  [POD_ERRORS.TX_POLLING_TIMEOUT]: {
    name: "TX_POLLING_TIMEOUT",
    category: "EXECUTION",
    description: "Transaction polling attempts exhausted",
    retryable: false,
    severity: "warning",
    suggestion:
      "Could not find the transaction after multiple attempts. The transaction may still be pending.",
  },
  [POD_ERRORS.TX_REVERTED]: {
    name: "TX_REVERTED",
    category: "EXECUTION",
    description: "Transaction execution reverted",
    retryable: false,
    severity: "error",
    suggestion:
      "The transaction was rejected by the network. Check the transaction parameters and contract state.",
  },
  [POD_ERRORS.NONCE_TOO_LOW]: {
    name: "NONCE_TOO_LOW",
    category: "EXECUTION",
    description: "Transaction nonce is too low (already used)",
    retryable: true,
    severity: "warning",
    suggestion:
      "This nonce has already been used. The SDK will automatically fetch the correct nonce.",
  },
  [POD_ERRORS.NONCE_TOO_HIGH]: {
    name: "NONCE_TOO_HIGH",
    category: "EXECUTION",
    description: "Transaction nonce is too high",
    retryable: true,
    severity: "warning",
    suggestion: "The nonce is higher than expected. Wait for pending transactions to complete.",
  },
  [POD_ERRORS.TX_ALREADY_KNOWN]: {
    name: "TX_ALREADY_KNOWN",
    category: "EXECUTION",
    description: "Transaction already in mempool",
    retryable: false,
    severity: "info",
    suggestion:
      "This exact transaction is already pending. Wait for it to be confirmed or submit with different parameters.",
  },

  // Execution errors - Validation
  [POD_ERRORS.MISSING_PARAMETER]: {
    name: "MISSING_PARAMETER",
    category: "EXECUTION",
    description: "Required parameter is missing",
    retryable: false,
    severity: "error",
    suggestion: "A required parameter was not provided. Check the function signature.",
  },
  [POD_ERRORS.INVALID_PARAMETER]: {
    name: "INVALID_PARAMETER",
    category: "EXECUTION",
    description: "Parameter has invalid value or format",
    retryable: false,
    severity: "error",
    suggestion: "The parameter value is invalid. Check the expected type and format.",
  },
  [POD_ERRORS.VALIDATION_FAILED]: {
    name: "VALIDATION_FAILED",
    category: "EXECUTION",
    description: "Schema validation failed",
    retryable: false,
    severity: "error",
    suggestion: "The input does not match the expected schema. Review the validation errors.",
  },

  // Execution errors - RPC
  [POD_ERRORS.RPC_INVALID_RESPONSE]: {
    name: "RPC_INVALID_RESPONSE",
    category: "EXECUTION",
    description: "Invalid or malformed RPC response",
    retryable: true,
    severity: "error",
    suggestion: "The server returned an invalid response. This may be a temporary issue.",
  },
  [POD_ERRORS.RPC_METHOD_NOT_FOUND]: {
    name: "RPC_METHOD_NOT_FOUND",
    category: "EXECUTION",
    description: "RPC method not found",
    retryable: false,
    severity: "error",
    suggestion:
      "The RPC method is not supported by this endpoint. Verify you are using the correct RPC URL.",
  },
  [POD_ERRORS.RPC_INVALID_PARAMS]: {
    name: "RPC_INVALID_PARAMS",
    category: "EXECUTION",
    description: "Invalid RPC parameters",
    retryable: false,
    severity: "error",
    suggestion: "The RPC parameters are invalid. Check the method documentation.",
  },
  [POD_ERRORS.RPC_INTERNAL_ERROR]: {
    name: "RPC_INTERNAL_ERROR",
    category: "EXECUTION",
    description: "RPC internal server error",
    retryable: true,
    severity: "error",
    suggestion: "The server encountered an internal error. This may be temporary - try again.",
  },
  [POD_ERRORS.RPC_PARSE_ERROR]: {
    name: "RPC_PARSE_ERROR",
    category: "EXECUTION",
    description: "RPC JSON parse error",
    retryable: false,
    severity: "error",
    suggestion: "The request could not be parsed. Check the request format.",
  },

  // Execution errors - Contract
  [POD_ERRORS.CONTRACT_REVERT]: {
    name: "CONTRACT_REVERT",
    category: "EXECUTION",
    description: "Smart contract execution reverted",
    retryable: false,
    severity: "error",
    suggestion:
      "The contract rejected the transaction. Check the revert reason and contract requirements.",
  },
  [POD_ERRORS.CONTRACT_DECODE_FAILED]: {
    name: "CONTRACT_DECODE_FAILED",
    category: "EXECUTION",
    description: "Failed to decode contract response",
    retryable: false,
    severity: "error",
    suggestion: "Could not decode the contract response. Verify the ABI matches the contract.",
  },

  // Execution errors - WebSocket
  [POD_ERRORS.WS_CONNECTION_FAILED]: {
    name: "WS_CONNECTION_FAILED",
    category: "EXECUTION",
    description: "WebSocket connection failed",
    retryable: true,
    severity: "error",
    suggestion: "Could not establish WebSocket connection. Check the URL and network connection.",
  },
  [POD_ERRORS.WS_SEND_ERROR]: {
    name: "WS_SEND_ERROR",
    category: "EXECUTION",
    description: "Failed to send WebSocket message",
    retryable: true,
    severity: "error",
    suggestion: "Could not send the message. The connection may have been lost.",
  },
  [POD_ERRORS.WS_RECEIVE_ERROR]: {
    name: "WS_RECEIVE_ERROR",
    category: "EXECUTION",
    description: "Failed to receive WebSocket message",
    retryable: true,
    severity: "error",
    suggestion: "Could not receive the message. The connection may have been lost.",
  },
  [POD_ERRORS.WS_SERVER_ERROR]: {
    name: "WS_SERVER_ERROR",
    category: "EXECUTION",
    description: "WebSocket server error",
    retryable: true,
    severity: "error",
    suggestion: "The server returned an error. This may be temporary - try reconnecting.",
  },
  [POD_ERRORS.WS_SUBSCRIPTION_LIMIT]: {
    name: "WS_SUBSCRIPTION_LIMIT",
    category: "EXECUTION",
    description: "WebSocket subscription limit exceeded",
    retryable: false,
    severity: "warning",
    suggestion: "Too many active subscriptions. Unsubscribe from unused subscriptions first.",
  },
  [POD_ERRORS.WS_SUBSCRIPTION_FAILED]: {
    name: "WS_SUBSCRIPTION_FAILED",
    category: "EXECUTION",
    description: "WebSocket subscription failed",
    retryable: false,
    severity: "error",
    suggestion: "Could not create the subscription. Check the subscription parameters.",
  },
  [POD_ERRORS.WS_NOT_CONNECTED]: {
    name: "WS_NOT_CONNECTED",
    category: "EXECUTION",
    description: "WebSocket not connected",
    retryable: false,
    severity: "error",
    suggestion: "The WebSocket is not connected. Call connect() first.",
  },

  // Wallet errors
  [POD_ERRORS.WALLET_INVALID_KEY]: {
    name: "WALLET_INVALID_KEY",
    category: "WALLET",
    description: "Invalid private key format",
    retryable: false,
    severity: "error",
    suggestion: "The private key format is invalid. It should be a 32-byte hex string.",
  },
  [POD_ERRORS.WALLET_INVALID_MNEMONIC]: {
    name: "WALLET_INVALID_MNEMONIC",
    category: "WALLET",
    description: "Invalid mnemonic phrase",
    retryable: false,
    severity: "error",
    suggestion: "The mnemonic phrase is invalid. It should be 12 or 24 BIP-39 words.",
  },
  [POD_ERRORS.WALLET_DERIVATION_ERROR]: {
    name: "WALLET_DERIVATION_ERROR",
    category: "WALLET",
    description: "HD wallet derivation failed",
    retryable: false,
    severity: "error",
    suggestion: "Could not derive the key. Check the derivation path format.",
  },
  [POD_ERRORS.WALLET_KEYSTORE_ERROR]: {
    name: "WALLET_KEYSTORE_ERROR",
    category: "WALLET",
    description: "Keystore operation failed",
    retryable: false,
    severity: "error",
    suggestion: "The keystore operation failed. The file may be corrupted or invalid.",
  },
  [POD_ERRORS.WALLET_INVALID_PASSWORD]: {
    name: "WALLET_INVALID_PASSWORD",
    category: "WALLET",
    description: "Invalid keystore password",
    retryable: false,
    severity: "error",
    suggestion: "The password is incorrect. Please try again.",
  },
  [POD_ERRORS.WALLET_SIGNING_FAILED]: {
    name: "WALLET_SIGNING_FAILED",
    category: "WALLET",
    description: "Transaction signing failed",
    retryable: false,
    severity: "error",
    suggestion: "Could not sign the transaction. Check the wallet state.",
  },
  [POD_ERRORS.WALLET_NOT_CONNECTED]: {
    name: "WALLET_NOT_CONNECTED",
    category: "WALLET",
    description: "Browser wallet not connected",
    retryable: false,
    severity: "error",
    suggestion: "The wallet is not connected. Call connect() to connect.",
  },
  [POD_ERRORS.WALLET_CHAIN_MISMATCH]: {
    name: "WALLET_CHAIN_MISMATCH",
    category: "WALLET",
    description: "Wallet connected to wrong chain",
    retryable: false,
    severity: "error",
    suggestion: "The wallet is connected to a different network. Switch to the correct chain.",
  },
  [POD_ERRORS.WALLET_USER_REJECTED]: {
    name: "WALLET_USER_REJECTED",
    category: "WALLET",
    description: "User rejected wallet request",
    retryable: false,
    severity: "info",
    suggestion: "The user declined the request in their wallet.",
  },

  // Auction errors
  [POD_ERRORS.AUCTION_NOT_FOUND]: {
    name: "AUCTION_NOT_FOUND",
    category: "AUCTION",
    description: "Auction not found",
    retryable: false,
    severity: "error",
    suggestion: "The auction does not exist. Check the auction ID.",
  },
  [POD_ERRORS.AUCTION_TIMEOUT]: {
    name: "AUCTION_TIMEOUT",
    category: "AUCTION",
    description: "Auction deadline timeout",
    retryable: false,
    severity: "warning",
    suggestion: "The auction deadline has passed or timed out waiting.",
  },
  [POD_ERRORS.AUCTION_ENDED]: {
    name: "AUCTION_ENDED",
    category: "AUCTION",
    description: "Auction has ended",
    retryable: false,
    severity: "info",
    suggestion: "This auction has already ended. Start a new auction to continue.",
  },
  [POD_ERRORS.BID_TOO_LOW]: {
    name: "BID_TOO_LOW",
    category: "AUCTION",
    description: "Bid amount too low",
    retryable: false,
    severity: "warning",
    suggestion: "Your bid is below the minimum. Increase the bid amount.",
  },
  [POD_ERRORS.AUCTION_DECODE_FAILED]: {
    name: "AUCTION_DECODE_FAILED",
    category: "AUCTION",
    description: "Failed to decode auction response",
    retryable: false,
    severity: "error",
    suggestion: "Could not decode the auction response. This may be a protocol issue.",
  },

  // Orderbook errors
  [POD_ERRORS.ORDERBOOK_NOT_FOUND]: {
    name: "ORDERBOOK_NOT_FOUND",
    category: "ORDERBOOK",
    description: "Orderbook not found",
    retryable: false,
    severity: "error",
    suggestion: "The orderbook does not exist. Check the orderbook ID.",
  },
  [POD_ERRORS.ORDER_INVALID]: {
    name: "ORDER_INVALID",
    category: "ORDERBOOK",
    description: "Invalid order parameters",
    retryable: false,
    severity: "error",
    suggestion: "The order parameters are invalid. Check the price, volume, and side.",
  },
  [POD_ERRORS.ORDERBOOK_DECODE_FAILED]: {
    name: "ORDERBOOK_DECODE_FAILED",
    category: "ORDERBOOK",
    description: "Failed to decode orderbook response",
    retryable: false,
    severity: "error",
    suggestion: "Could not decode the orderbook response. This may be a protocol issue.",
  },

  // Unknown error
  [POD_ERRORS.UNKNOWN]: {
    name: "UNKNOWN",
    category: "NETWORK",
    description: "Unknown or unclassified error",
    retryable: false,
    severity: "error",
    suggestion: "An unexpected error occurred. Check the error details for more information.",
  },
};

/**
 * Get metadata for an error code.
 */
export function getErrorMetadata(code: PodErrorCode): ErrorCodeMetadata {
  return ERROR_CODE_METADATA[code];
}

/**
 * Check if an error code is retryable.
 */
export function isRetryableCode(code: PodErrorCode): boolean {
  return ERROR_CODE_METADATA[code].retryable;
}

/**
 * Get suggestion for an error code.
 */
export function getSuggestion(code: PodErrorCode): string {
  return ERROR_CODE_METADATA[code].suggestion;
}

/**
 * Get category for an error code.
 */
export function getCategory(code: PodErrorCode): PodErrorCategory {
  return ERROR_CODE_METADATA[code].category;
}
