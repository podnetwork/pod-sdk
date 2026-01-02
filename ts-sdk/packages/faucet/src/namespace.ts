/**
 * @module faucet/namespace
 * @description Faucet namespace for testnet token requests
 */

import { PodFundingError, AddressSchema, type Hash, type AddressLike } from "@podnetwork/core";
import { FaucetResponseDataSchema } from "./schemas/index.js";

/**
 * Faucet response with transaction hashes.
 *
 * The faucet funds both native POD tokens and USDT by default,
 * returning a transaction hash for each.
 *
 * @example
 * ```typescript
 * const response = await faucet.fund(address);
 * console.log(`Funded with ${response.txHashes.length} transactions`);
 * for (const txHash of response.txHashes) {
 *   console.log(`  ${txHash}`);
 * }
 * ```
 */
export interface FaucetResponse {
  /** Transaction hashes of the faucet transfers */
  readonly txHashes: readonly Hash[];
}

/**
 * Configuration for the faucet client.
 */
export interface FaucetConfig {
  /** Faucet API base URL (e.g., 'https://faucet.testnet.pod.network') */
  readonly url: string;
  /** Request timeout in milliseconds */
  readonly timeout: number;
  /** Maximum retry attempts */
  readonly maxRetries: number;
}

/**
 * Faucet client for requesting testnet tokens.
 *
 * The faucet API is a REST service (not JSON-RPC) that funds addresses
 * with native POD tokens and USDT for testing.
 *
 * @example
 * ```typescript
 * import { FaucetNamespace } from '@podnetwork/faucet';
 *
 * const faucet = new FaucetNamespace({
 *   url: 'https://faucet.testnet.pod.network',
 *   timeout: 30000,
 *   maxRetries: 3,
 * });
 *
 * // Request testnet tokens
 * const response = await faucet.fund(address);
 * console.log(`Funded with ${response.txHashes.length} transactions`);
 * ```
 */
export class FaucetNamespace {
  private readonly config: FaucetConfig;

  /**
   * Creates a new FaucetNamespace.
   *
   * @param config - Faucet configuration
   */
  constructor(config: FaucetConfig) {
    this.config = config;
  }

  /**
   * Funds the specified address with testnet tokens.
   *
   * By default, funds both native POD tokens and USDT tokens.
   * Returns transaction hashes for each funding transaction.
   *
   * @param address - The address to receive tokens (validates format)
   * @returns Response with transaction hashes
   * @throws {PodFundingError} If rate limited, unavailable, or address is invalid
   *
   * @example
   * ```typescript
   * try {
   *   const response = await faucet.fund(address);
   *   console.log(`Funded with ${response.txHashes.length} transactions:`);
   *   for (const txHash of response.txHashes) {
   *     console.log(`  ${txHash}`);
   *   }
   * } catch (error) {
   *   if (error instanceof PodFundingError && error.code === 'RATE_LIMITED') {
   *     console.log('Rate limited. Try again later.');
   *   }
   * }
   * ```
   */
  async fund(address: AddressLike): Promise<FaucetResponse> {
    // Validate address format
    let validatedAddress: string;
    try {
      validatedAddress = AddressSchema.parse(address);
    } catch (error) {
      throw PodFundingError.faucetRequestFailed(
        `Invalid address: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const url = `${this.config.url.replace(/\/$/, "")}/fund`;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, this.config.timeout);

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address: validatedAddress,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle HTTP error responses
        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const waitTime =
              retryAfter !== null && retryAfter !== "" ? parseInt(retryAfter, 10) * 1000 : 3600000;
            throw PodFundingError.rateLimited(waitTime);
          }

          if (response.status === 503) {
            throw PodFundingError.faucetUnavailable("Service temporarily unavailable");
          }

          const errorBody = await response.text();
          const message = errorBody !== "" ? errorBody : response.statusText;
          throw PodFundingError.faucetRequestFailed(`HTTP ${String(response.status)}: ${message}`);
        }

        // Parse response
        const data: unknown = await response.json();

        // Check for error response format
        if (typeof data === "object" && data !== null && "error" in data) {
          const errorData = data as { error: string };
          throw PodFundingError.faucetRequestFailed(errorData.error);
        }

        // Validate response schema
        const parsed = FaucetResponseDataSchema.safeParse(data);
        if (!parsed.success) {
          throw PodFundingError.faucetRequestFailed(`Invalid response: ${parsed.error.message}`);
        }

        return {
          txHashes: parsed.data.txHashes,
        };
      } catch (error) {
        // Don't retry PodFundingError (rate limit, unavailable, etc.)
        if (error instanceof PodFundingError) {
          throw error;
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        // Only retry network errors, not validation errors
        if (attempt < this.config.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, capped at 10s
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    throw PodFundingError.faucetRequestFailed(
      lastError?.message ?? "Request failed after all retries"
    );
  }

  /**
   * Sleep for the specified duration.
   * @internal
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
