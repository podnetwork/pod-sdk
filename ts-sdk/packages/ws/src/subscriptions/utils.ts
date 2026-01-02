/**
 * @module ws/subscriptions/utils
 * @description Shared utilities for WebSocket subscriptions
 */

import type { WebSocketConnection } from "../connection.js";
import type { SubscriptionOptions, WebSocketChannel, WsSubscriptionParams } from "../types.js";

/**
 * Creates an async iterable from a WebSocket subscription.
 *
 * This is the core utility for converting WebSocket subscriptions into
 * async iterables that can be consumed with `for await...of`.
 *
 * @param connection - The WebSocket connection
 * @param channel - The WebSocket channel to subscribe to
 * @param params - The subscription parameters
 * @param transform - Transform function for incoming messages
 * @param options - Subscription options
 * @returns AsyncIterable of transformed messages
 *
 * @internal
 */
export function createAsyncIterable<T>(
  connection: WebSocketConnection,
  channel: WebSocketChannel,
  params: WsSubscriptionParams | undefined,
  transform: (data: unknown) => T,
  options?: SubscriptionOptions
): AsyncIterable<T> {
  const bufferSize = options?.bufferSize ?? 100;

  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      // Message buffer
      const buffer: T[] = [];
      // Pending resolve callback for next()
      let pendingResolve: ((result: IteratorResult<T>) => void) | null = null;
      // Channel (set after subscription is established)
      let subscribedChannel: WebSocketChannel | null = null;
      // Error that occurred
      let error: Error | null = null;
      // Whether the subscription is done
      let done = false;
      // Whether the iterator has started
      let started = false;

      // Handle abort signal
      const onAbort = (): void => {
        done = true;
        if (subscribedChannel !== null) {
          connection.unsubscribe(subscribedChannel);
        }
        if (pendingResolve !== null) {
          pendingResolve({ done: true, value: undefined as unknown as T });
          pendingResolve = null;
        }
      };

      options?.signal?.addEventListener("abort", onAbort, { once: true });

      const cleanup = (): void => {
        options?.signal?.removeEventListener("abort", onAbort);
        done = true;
        if (subscribedChannel !== null) {
          connection.unsubscribe(subscribedChannel);
        }
      };

      return {
        async next(): Promise<IteratorResult<T>> {
          // Check if aborted
          if (options?.signal?.aborted === true) {
            cleanup();
            return { done: true, value: undefined as unknown as T };
          }

          // If there was an error, throw it
          if (error !== null) {
            cleanup();
            throw error;
          }

          // If done, return
          if (done) {
            return { done: true, value: undefined as unknown as T };
          }

          // Start subscription on first call
          if (!started) {
            started = true;
            try {
              subscribedChannel = await connection.subscribe(
                channel,
                params,
                (data) => {
                  try {
                    const transformed = transform(data);

                    // If there's a pending resolve, use it
                    if (pendingResolve !== null) {
                      pendingResolve({ done: false, value: transformed });
                      pendingResolve = null;
                    } else {
                      // Otherwise buffer the message
                      if (buffer.length < bufferSize) {
                        buffer.push(transformed);
                      }
                      // Drop if buffer is full (backpressure)
                    }
                  } catch (transformError) {
                    error = transformError as Error;
                    if (pendingResolve !== null) {
                      pendingResolve({ done: true, value: undefined as unknown as T });
                      pendingResolve = null;
                    }
                  }
                },
                (subError) => {
                  error = subError;
                  done = true;
                  if (pendingResolve !== null) {
                    pendingResolve({ done: true, value: undefined as unknown as T });
                    pendingResolve = null;
                  }
                },
                () => {
                  done = true;
                  if (pendingResolve !== null) {
                    pendingResolve({ done: true, value: undefined as unknown as T });
                    pendingResolve = null;
                  }
                }
              );
            } catch (subError) {
              cleanup();
              throw subError;
            }
          }

          // Check again after subscription (error could be set in callbacks)
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (error !== null) {
            cleanup();
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw error;
          }

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (done) {
            return { done: true, value: undefined as unknown as T };
          }

          // If there's something in the buffer, return it
          const bufferedValue = buffer.shift();
          if (bufferedValue !== undefined) {
            return { done: false, value: bufferedValue };
          }

          // Wait for next message
          return new Promise((resolve) => {
            pendingResolve = resolve;
          });
        },

        // eslint-disable-next-line @typescript-eslint/promise-function-async
        return(): Promise<IteratorResult<T>> {
          cleanup();
          return Promise.resolve({ done: true, value: undefined as unknown as T });
        },

        // eslint-disable-next-line @typescript-eslint/promise-function-async
        throw(err: Error): Promise<IteratorResult<T>> {
          error = err;
          cleanup();
          return Promise.reject(err);
        },
      };
    },
  };
}
