/**
 * @module hooks/use-faucet
 * @description Hook for requesting testnet tokens from the faucet
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { PodError } from "@podnetwork/core";
import { useClient } from "../providers/client-provider.js";
import type { Address, Hash, PodError as PodErrorType } from "../types.js";

/**
 * Options for useFaucet hook.
 * @category Hooks
 */
export interface UseFaucetOptions {
  /** Cooldown period in ms between requests. Default: 60000 (1 minute) */
  readonly cooldownMs?: number;
}

/**
 * Faucet request status.
 * @category Hooks
 */
export type FaucetStatus = "idle" | "requesting" | "success" | "error" | "cooldown";

/**
 * Return type for useFaucet hook.
 * @category Hooks
 */
export interface UseFaucetResult {
  /** Current faucet request status */
  readonly status: FaucetStatus;
  /** Whether a request is in progress */
  readonly isRequesting: boolean;
  /** Transaction hash of the last successful request */
  readonly txHash: Hash | null;
  /** Error from the most recent request attempt */
  readonly error: PodErrorType | null;
  /** Remaining cooldown time in ms (0 if not in cooldown) */
  readonly cooldownRemaining: number;
  /** Request tokens from the faucet */
  readonly request: (address: Address) => Promise<Hash | null>;
  /** Reset the hook state */
  readonly reset: () => void;
}

/**
 * Hook for requesting testnet tokens from the faucet.
 *
 * @param options - Hook configuration options
 * @returns Faucet request state and actions
 *
 * @example
 * ```tsx
 * function FaucetButton({ address }: { address: Address }) {
 *   const { status, request, isRequesting, cooldownRemaining } = useFaucet();
 *
 *   const handleClick = async () => {
 *     const txHash = await request(address);
 *     if (txHash) {
 *       console.log('Tokens sent:', txHash);
 *     }
 *   };
 *
 *   if (status === 'cooldown') {
 *     return <button disabled>Wait {Math.ceil(cooldownRemaining / 1000)}s</button>;
 *   }
 *
 *   return (
 *     <button onClick={handleClick} disabled={isRequesting}>
 *       {isRequesting ? 'Requesting...' : 'Request Tokens'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useFaucet(options: UseFaucetOptions = {}): UseFaucetResult {
  const { cooldownMs = 60000 } = options;

  const client = useClient();

  const [status, setStatus] = useState<FaucetStatus>("idle");
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [error, setError] = useState<PodErrorType | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const isMountedRef = useRef(true);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const cooldownEndRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (cooldownIntervalRef.current !== undefined) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, []);

  // Start cooldown timer
  const startCooldown = useCallback(() => {
    cooldownEndRef.current = Date.now() + cooldownMs;
    setCooldownRemaining(cooldownMs);
    setStatus("cooldown");

    cooldownIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) return;

      const remaining = Math.max(0, cooldownEndRef.current - Date.now());
      setCooldownRemaining(remaining);

      if (remaining === 0) {
        if (cooldownIntervalRef.current !== undefined) {
          clearInterval(cooldownIntervalRef.current);
        }
        setStatus("idle");
      }
    }, 1000);
  }, [cooldownMs]);

  // Request tokens
  const request = useCallback(
    async (address: Address): Promise<Hash | null> => {
      if (status === "cooldown" || status === "requesting") {
        return null;
      }

      setStatus("requesting");
      setError(null);

      try {
        // The faucet client is typically accessed via a separate endpoint
        // For now, we'll simulate the pattern - actual implementation depends on faucet SDK
        const faucetClient = (
          client as unknown as { faucet?: { request: (address: Address) => Promise<Hash> } }
        ).faucet;

        if (faucetClient === undefined) {
          throw new Error(
            "Faucet not available. Ensure you're connected to a testnet with faucet support."
          );
        }

        const hash = await faucetClient.request(address);

        if (isMountedRef.current) {
          setTxHash(hash);
          setStatus("success");
          startCooldown();
        }

        return hash;
      } catch (err) {
        if (!isMountedRef.current) return null;

        const podError = PodError.from(err);
        setError(podError);
        setStatus("error");
        return null;
      }
    },
    [client, status, startCooldown]
  );

  // Reset state
  const reset = useCallback(() => {
    if (cooldownIntervalRef.current !== undefined) {
      clearInterval(cooldownIntervalRef.current);
    }
    setStatus("idle");
    setTxHash(null);
    setError(null);
    setCooldownRemaining(0);
    cooldownEndRef.current = 0;
  }, []);

  return useMemo(
    () => ({
      status,
      isRequesting: status === "requesting",
      txHash,
      error,
      cooldownRemaining,
      request,
      reset,
    }),
    [status, txHash, error, cooldownRemaining, request, reset]
  );
}
