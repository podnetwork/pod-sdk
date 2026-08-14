// One JSON-RPC POST, shared by every raw-RPC caller in the SDK.
//
// Deliberately not viem: this is reachable from the main entry, and read-only
// consumers should not pull a signing library in to read a block number. The
// `/write` entry uses viem because it must.

export interface RpcOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
}

export class PodRpcError extends Error {
  constructor(public code: number | undefined, message: string) {
    super(message);
    this.name = "PodRpcError";
  }
}

/** Call `method` and return its result, throwing {@link PodRpcError} on an
 * error response. Use {@link tryRpc} where an error is an expected state. */
export async function rpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[] = [],
  opts?: RpcOptions,
): Promise<T> {
  const doFetch = opts?.fetch ?? fetch;
  const res = await doFetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: opts?.signal,
  });
  const json = (await res.json()) as { result?: T; error?: { code?: number; message?: string } };
  if (json.error) throw new PodRpcError(json.error.code, json.error.message ?? `${method} failed`);
  if (json.result === undefined) throw new PodRpcError(undefined, `${method} returned no result`);
  return json.result;
}

/** {@link rpc}, but an error response (or a transport failure) yields
 * `undefined` instead of throwing — for methods whose failure is a state the
 * caller expects and handles, not an exception. */
export async function tryRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[] = [],
  opts?: RpcOptions,
): Promise<T | undefined> {
  try {
    return await rpc<T>(rpcUrl, method, params, opts);
  } catch {
    return undefined;
  }
}
