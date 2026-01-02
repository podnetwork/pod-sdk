/**
 * @module rpc/client
 * @description Base JSON-RPC client with retry logic and exponential backoff
 */

import { getLogger, LoggerCategory, type LoggerCategoryType } from "../logging/index.js";
import { PodExecutionError, PodNetworkError } from "../errors/index.js";

/**
 * JSON-RPC request structure.
 */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: unknown[];
}

/**
 * JSON-RPC response structure.
 */
export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * RPC transport configuration.
 */
export interface RpcTransportConfig {
  /** RPC endpoint URL */
  url: string;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
}

/**
 * Hook for handling HTTP responses before JSON parsing.
 *
 * Subclasses can use this to handle specific HTTP status codes
 * (e.g., 429 rate limiting, 503 service unavailable) before the
 * standard error handling kicks in.
 *
 * @param response - The HTTP response
 * @param url - The request URL
 * @throws Should throw an appropriate error to abort the request
 */
export type HttpResponseHook = (response: Response, url: string) => Promise<void> | void;

/**
 * Hook for determining if an error should be retried.
 *
 * Subclasses can use this to mark additional error types as non-retryable.
 *
 * @param error - The error that occurred
 * @returns `true` if the error should NOT be retried
 */
export type NonRetryableErrorHook = (error: Error) => boolean;

/**
 * Base JSON-RPC client with retry logic and exponential backoff.
 *
 * This class provides the common RPC functionality used by all namespace
 * implementations. Subclasses can customize behavior via hooks.
 *
 * @example
 * ```typescript
 * class MyNamespace extends JsonRpcClient {
 *   constructor(config: RpcTransportConfig) {
 *     super(config, LoggerCategory.RPC);
 *   }
 *
 *   async myMethod(): Promise<string> {
 *     return this.request<string>('my_method', []);
 *   }
 * }
 * ```
 */
export class JsonRpcClient {
  protected readonly url: string;
  protected readonly timeout: number;
  protected readonly maxRetries: number;
  protected readonly loggerCategory: LoggerCategoryType;
  private requestId = 0;

  /**
   * Optional hook for custom HTTP response handling.
   *
   * Set this in subclass constructors to handle specific HTTP status codes
   * (e.g., 429 for rate limiting) before standard error processing.
   */
  protected httpResponseHook?: HttpResponseHook;

  /**
   * Optional hook for marking additional errors as non-retryable.
   *
   * By default, only RpcError instances are not retried.
   * Set this in subclass constructors to prevent retrying other error types.
   */
  protected nonRetryableErrorHook?: NonRetryableErrorHook;

  /**
   * Base delay for exponential backoff in milliseconds.
   * Actual delay is: baseRetryDelay * 2^attempt
   */
  protected baseRetryDelay = 100;

  /**
   * Maximum delay for exponential backoff in milliseconds.
   * Set to 0 for no maximum.
   */
  protected maxRetryDelay = 0;

  constructor(config: RpcTransportConfig, loggerCategory: LoggerCategoryType = LoggerCategory.RPC) {
    this.url = config.url;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
    this.loggerCategory = loggerCategory;
  }

  /**
   * Gets the logger for this client.
   */
  protected get logger(): ReturnType<typeof getLogger> {
    return getLogger(this.loggerCategory);
  }

  /**
   * Sends a JSON-RPC request with retry logic.
   *
   * @param method - RPC method name
   * @param params - Method parameters
   * @returns Promise resolving to the result
   * @throws {RpcError} If the server returns an error response
   * @throws {NetworkError} If the request fails after all retries
   */
  protected async request<T>(method: string, params: unknown[] = []): Promise<T> {
    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    // Redact params for sensitive methods (e.g., signed transaction data)
    const logParams =
      method === "eth_sendRawTransaction" ? ["[REDACTED - signed transaction]"] : params;
    this.logger.debug("RPC request", { method, id, params: logParams });

    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.sendRequest<T>(request);
        this.logger.debug("RPC response", { method, id, hasError: response.error !== undefined });

        if (response.error !== undefined) {
          throw PodExecutionError.fromRpcError(response.error);
        }

        return response.result as T;
      } catch (error) {
        lastError = error as Error;

        // Don't retry RPC errors (server responded with error)
        if (error instanceof PodExecutionError) {
          throw error;
        }

        // Check if subclass marks this error as non-retryable
        if (this.nonRetryableErrorHook?.(lastError) === true) {
          throw error;
        }

        // Retry network errors
        if (attempt < this.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn("RPC request failed, retrying", {
            method,
            attempt: attempt + 1,
            maxRetries: this.maxRetries,
            delay,
            error: lastError.message,
          });
          await this.sleep(delay);
        }
      }
    }

    // lastError is always set after at least one iteration
    // This line is unreachable if maxRetries >= 1, but we keep it for type safety
    throw lastError ?? new Error("Request failed with no error captured");
  }

  /**
   * Calculates the delay before retrying a request.
   *
   * Uses exponential backoff with jitter: baseRetryDelay * 2^attempt * (0.5 + random)
   *
   * The jitter helps prevent thundering herd problems when multiple clients
   * retry simultaneously.
   *
   * @param attempt - The current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  protected calculateRetryDelay(attempt: number): number {
    const baseDelay = this.baseRetryDelay * Math.pow(2, attempt);
    // Add jitter: multiply by random value between 0.5 and 1.5
    const jitter = 0.5 + Math.random();
    const delay = Math.floor(baseDelay * jitter);
    return this.maxRetryDelay > 0 ? Math.min(delay, this.maxRetryDelay) : delay;
  }

  /**
   * Sends a single HTTP request.
   * @internal
   */
  private async sendRequest<T>(request: JsonRpcRequest): Promise<JsonRpcResponse<T>> {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      // Allow subclasses to handle specific HTTP status codes
      if (this.httpResponseHook !== undefined) {
        await this.httpResponseHook(response, this.url);
      }

      if (!response.ok) {
        throw PodNetworkError.fromHttpStatus(this.url, response.status, response.statusText);
      }

      return (await response.json()) as JsonRpcResponse<T>;
    } catch (error) {
      if (error instanceof PodNetworkError || error instanceof PodExecutionError) {
        throw error;
      }

      // Handle timeout
      if (error instanceof Error && error.name === "TimeoutError") {
        throw PodNetworkError.timeout(this.url, this.timeout);
      }

      // Handle other fetch errors
      throw PodNetworkError.connectionFailed(this.url, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Sleep helper for retries.
   * @internal
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
