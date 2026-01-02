import { Interface, type InterfaceAbi } from "ethers";
import type { Abi } from "abitype";
import type { Hash } from "@podnetwork/core";
import { MethodNotFoundError, ContractRevertError } from "./errors/index.js";

/**
 * Decoded contract event with typed arguments.
 */
export interface DecodedContractEvent {
  /** Event name */
  readonly name: string;
  /** Decoded event arguments */
  readonly args: readonly unknown[];
  /** Event topic hash */
  readonly topic: string;
  /** Block number where event was emitted */
  readonly blockNumber: bigint | null;
  /** Transaction hash that emitted the event */
  readonly transactionHash: string | null;
  /** Log index within the block */
  readonly logIndex: number | null;
}

/**
 * Event filter for subscribing to contract events.
 */
export interface ContractEventFilter {
  /** Contract address to filter (defaults to contract address) */
  address?: `0x${string}`;
  /** Event topics (first is event signature, rest are indexed parameters) */
  topics: readonly (`0x${string}` | null)[];
}

/**
 * Log entry from blockchain (matches @podnetwork/core Log type).
 */
export interface ContractLog {
  /** Contract address that emitted the log */
  address: `0x${string}`;
  /** Log topics */
  topics: readonly `0x${string}`[];
  /** Log data */
  data: `0x${string}`;
  /** Block number */
  blockNumber?: bigint | undefined;
  /** Transaction hash */
  transactionHash?: `0x${string}` | undefined;
  /** Log index */
  logIndex?: number | undefined;
}

/**
 * Address type (hex string starting with 0x)
 */
export type Address = `0x${string}`;

/**
 * Transaction sender interface matching @podnetwork/core pattern.
 *
 * This minimal interface allows the contracts package to send transactions
 * without circular dependencies on the full client.
 */
export interface TransactionSender {
  /** Send a raw signed transaction */
  sendRawTransaction(signedTx: string): Promise<Hash>;
  /** Get transaction count (nonce) for an address */
  getTransactionCount(address: `0x${string}`): Promise<bigint>;
  /** Estimate gas for a transaction */
  estimateGas(tx: { to?: `0x${string}`; data?: string; value?: bigint }): Promise<bigint>;
  /** Get current gas price */
  getGasPrice(): Promise<bigint>;
  /** Get chain ID */
  getChainId(): Promise<bigint>;
  /** Execute a read-only call (eth_call) */
  call(tx: { to: `0x${string}`; data: string }): Promise<`0x${string}`>;
  /** Gas estimation buffer as percentage */
  readonly gasEstimationBuffer: number;
}

/**
 * Signer interface for write operations.
 *
 * Compatible with @podnetwork/wallet.
 */
export interface ContractSigner {
  /** Get the signer's address */
  getAddress(): Promise<`0x${string}`>;
  /** Sign a transaction and return the signed transaction hex */
  signTransaction(
    tx: {
      to?: `0x${string}` | undefined;
      value: bigint;
      data?: string | undefined;
      gas: bigint;
      maxFeePerGas: bigint;
      maxPriorityFeePerGas: bigint;
      nonce: bigint;
    },
    chainId: bigint
  ): Promise<string>;
}

/**
 * Pending contract transaction for tracking.
 */
export class PendingContractTransaction {
  /** Transaction hash */
  readonly txHash: Hash;

  constructor(txHash: Hash) {
    this.txHash = txHash;
  }
}

/**
 * Options for contract method calls
 */
export interface CallOptions {
  /** Value to send with the call (in wei) */
  value?: bigint;
  /** Gas limit override */
  gasLimit?: bigint;
  /** Block tag for read calls */
  blockTag?: "latest" | "pending" | "earliest" | bigint;
}

/**
 * Default gas limit for contract calls when estimation fails
 */
const DEFAULT_GAS_LIMIT = 300_000n;

/**
 * TypedContract provides type-safe contract interactions
 *
 * It wraps an ethers Interface for encoding/decoding and uses the pod SDK's
 * RPC and transaction infrastructure for actual calls.
 *
 * @example
 * ```typescript
 * const erc20 = new TypedContract(
 *   "0x...",
 *   erc20Abi,
 *   rpcConfig,
 *   sender
 * );
 *
 * // Read call
 * const balance = await erc20.read.balanceOf("0x...");
 *
 * // Write call
 * const pending = await erc20.write.transfer("0x...", 100n, signer);
 * console.log(`TX: ${pending.txHash}`);
 * ```
 */
export class TypedContract<TAbi extends Abi = Abi> {
  /** Contract address */
  readonly address: Address;

  /** Contract ABI */
  readonly abi: TAbi;

  /** ethers Interface for encoding/decoding */
  readonly interface: Interface;

  /** Transaction sender for read/write calls */
  private readonly sender: TransactionSender;

  /** Read method proxies */
  readonly read: TypedContractReadMethods<TAbi>;

  /** Write method proxies */
  readonly write: TypedContractWriteMethods<TAbi>;

  constructor(address: Address, abi: TAbi, sender: TransactionSender) {
    this.address = address;
    this.abi = abi;
    this.interface = new Interface(abi as InterfaceAbi);
    this.sender = sender;

    // Create proxy objects for read and write methods
    this.read = this.createReadProxy();
    this.write = this.createWriteProxy();
  }

  /**
   * Create a proxy for read methods (view/pure functions)
   */
  private createReadProxy(): TypedContractReadMethods<TAbi> {
    return new Proxy({} as TypedContractReadMethods<TAbi>, {
      get: (_target, prop: string) => {
        return async (...args: unknown[]) => {
          return this.callRead(prop, args);
        };
      },
    });
  }

  /**
   * Create a proxy for write methods (nonpayable/payable functions)
   */
  private createWriteProxy(): TypedContractWriteMethods<TAbi> {
    return new Proxy({} as TypedContractWriteMethods<TAbi>, {
      get: (_target, prop: string) => {
        return async (signer: ContractSigner, ...args: unknown[]) => {
          return this.callWrite(prop, args, signer);
        };
      },
    });
  }

  /**
   * Execute a read call (view/pure function)
   */
  async callRead(methodName: string, args: unknown[], _options?: CallOptions): Promise<unknown> {
    // Get the function fragment
    const fragment = this.interface.getFunction(methodName);
    if (fragment === null) {
      throw new MethodNotFoundError(methodName);
    }

    // Encode calldata
    const calldata = this.interface.encodeFunctionData(methodName, args);

    // Use sender's call method for RPC
    const result = await this.sender.call({
      to: this.address,
      data: calldata,
    });

    // Decode result
    const decoded = this.interface.decodeFunctionResult(methodName, result);

    // Unwrap single return values
    if (decoded.length === 1) {
      return decoded[0];
    }
    return decoded;
  }

  /**
   * Execute a write call (nonpayable/payable function)
   */
  async callWrite(
    methodName: string,
    args: unknown[],
    signer: ContractSigner,
    options?: CallOptions
  ): Promise<PendingContractTransaction> {
    // Get the function fragment
    const fragment = this.interface.getFunction(methodName);
    if (fragment === null) {
      throw new MethodNotFoundError(methodName);
    }

    // Encode calldata
    const calldata = this.interface.encodeFunctionData(methodName, args);

    // Get signer address and prepare transaction
    const from = await signer.getAddress();
    const nonce = await this.sender.getTransactionCount(from);
    const maxFeePerGas = await this.sender.getGasPrice();
    const chainId = await this.sender.getChainId();

    // Estimate gas
    let gas: bigint;
    if (options?.gasLimit !== undefined) {
      gas = options.gasLimit;
    } else {
      try {
        gas = await this.sender.estimateGas({
          to: this.address,
          data: calldata,
          value: options?.value ?? 0n,
        });
        // Apply gas estimation buffer
        gas = (gas * BigInt(this.sender.gasEstimationBuffer)) / 100n;
      } catch {
        // Default gas for contract calls
        gas = DEFAULT_GAS_LIMIT;
      }
    }

    // Sign transaction
    const signedTx = await signer.signTransaction(
      {
        to: this.address,
        value: options?.value ?? 0n,
        data: calldata,
        gas,
        maxFeePerGas,
        maxPriorityFeePerGas: 0n,
        nonce,
      },
      chainId
    );

    // Send transaction
    const txHash = await this.sender.sendRawTransaction(signedTx);

    return new PendingContractTransaction(txHash);
  }

  /**
   * Parse an error from revert data.
   *
   * Attempts to decode the error data using the contract's ABI.
   * Returns a ContractRevertError with the error name and decoded arguments
   * if the error signature is found in the ABI.
   *
   * @param data - Raw revert data (hex string)
   * @returns Parsed error or null if unknown
   *
   * @example
   * ```typescript
   * try {
   *   await contract.read.transfer(recipient, amount);
   * } catch (e) {
   *   if (e.data) {
   *     const parsed = contract.parseError(e.data);
   *     if (parsed) {
   *       console.log(`Error: ${parsed.errorName}`, parsed.errorArgs);
   *     }
   *   }
   * }
   * ```
   */
  parseError(data: string): ContractRevertError | null {
    try {
      const errorDesc = this.interface.parseError(data);
      if (errorDesc === null) {
        return null;
      }

      return new ContractRevertError(errorDesc.name, [...errorDesc.args], data);
    } catch {
      return null;
    }
  }

  /**
   * Get the error selector (first 4 bytes of keccak256 hash) for an error name.
   *
   * @param errorName - Name of the error in the ABI
   * @returns Error selector as hex string
   * @throws MethodNotFoundError if error is not found in ABI
   *
   * @example
   * ```typescript
   * const selector = contract.getErrorSelector('InsufficientBalance');
   * // Returns: '0xcf479181' (first 4 bytes of keccak256("InsufficientBalance(uint256,uint256)"))
   * ```
   */
  getErrorSelector(errorName: string): `0x${string}` {
    const error = this.interface.getError(errorName);
    if (error === null) {
      throw new MethodNotFoundError(errorName, "error");
    }
    return error.selector as `0x${string}`;
  }

  /**
   * Check if revert data matches a specific error.
   *
   * @param data - Raw revert data (hex string)
   * @param errorName - Name of the error to check for
   * @returns true if the revert data matches the error signature
   *
   * @example
   * ```typescript
   * if (contract.isError(revertData, 'InsufficientBalance')) {
   *   const parsed = contract.parseError(revertData);
   *   const [available, required] = parsed.errorArgs;
   *   console.log(`Need ${required}, have ${available}`);
   * }
   * ```
   */
  isError(data: string, errorName: string): boolean {
    try {
      const error = this.interface.getError(errorName);
      if (error === null) {
        return false;
      }
      return data.toLowerCase().startsWith(error.selector.toLowerCase());
    } catch {
      return false;
    }
  }

  /**
   * Get all error selectors mapped to error names.
   *
   * Useful for quickly identifying which error was thrown based on revert data.
   *
   * @returns Map of error selector (4 bytes) to error name
   *
   * @example
   * ```typescript
   * const selectors = contract.getErrorSelectors();
   * const revertSelector = revertData.slice(0, 10);
   * const errorName = selectors.get(revertSelector);
   * if (errorName) {
   *   console.log(`Contract reverted with: ${errorName}`);
   * }
   * ```
   */
  getErrorSelectors(): Map<`0x${string}`, string> {
    const selectors = new Map<`0x${string}`, string>();
    this.interface.forEachError((error) => {
      selectors.set(error.selector as `0x${string}`, error.name);
    });
    return selectors;
  }

  /**
   * Get the event topic (keccak256 hash) for an event name.
   *
   * @param eventName - Name of the event in the ABI
   * @returns Event topic hash
   * @throws MethodNotFoundError if event is not found in ABI
   *
   * @example
   * ```typescript
   * const transferTopic = contract.getEventTopic('Transfer');
   * // Returns: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
   * ```
   */
  getEventTopic(eventName: string): `0x${string}` {
    const event = this.interface.getEvent(eventName);
    if (event === null) {
      throw new MethodNotFoundError(eventName, "event");
    }
    return event.topicHash as `0x${string}`;
  }

  /**
   * Create an event filter for subscribing to specific events.
   *
   * Use this with @podnetwork/ws subscribeVerifiableLogs to filter
   * events from this contract.
   *
   * @param eventName - Name of the event to filter
   * @param indexedArgs - Optional indexed argument values for filtering
   * @returns ContractEventFilter for use with WS subscriptions
   *
   * @example
   * ```typescript
   * // Filter all Transfer events from this contract
   * const filter = contract.createEventFilter('Transfer');
   *
   * // Filter Transfer events to a specific address
   * const filter = contract.createEventFilter('Transfer', [null, recipientAddress]);
   *
   * // Use with WS subscription
   * for await (const log of ws.subscribeVerifiableLogs({
   *   address: filter.address,
   *   topics: filter.topics,
   * })) {
   *   const decoded = contract.decodeEventLog(log.log);
   *   console.log(`${decoded.name}:`, decoded.args);
   * }
   * ```
   */
  createEventFilter(eventName: string, indexedArgs?: readonly unknown[]): ContractEventFilter {
    const event = this.interface.getEvent(eventName);
    if (event === null) {
      throw new MethodNotFoundError(eventName, "event");
    }

    // Build topics array: [eventTopic, ...indexedArgs]
    const topics: (`0x${string}` | null)[] = [event.topicHash as `0x${string}`];

    if (indexedArgs !== undefined) {
      const indexedParams = event.inputs.filter((p) => p.indexed === true);

      for (let i = 0; i < indexedArgs.length; i++) {
        const arg = indexedArgs[i];
        const param = indexedParams[i];

        if (arg === null || arg === undefined) {
          topics.push(null);
        } else if (param !== undefined) {
          // Encode the indexed parameter
          const encoded = this.interface.encodeFilterTopics(eventName, [
            ...(Array(i).fill(null) as null[]),
            arg,
          ]);
          // Get the last non-null topic (the one we just encoded)
          const topic = encoded[i + 1];
          topics.push(topic !== null && topic !== undefined ? (topic as `0x${string}`) : null);
        }
      }
    }

    return {
      address: this.address,
      topics,
    };
  }

  /**
   * Decode a log entry into a typed event.
   *
   * @param log - Raw log entry from the blockchain
   * @returns Decoded event with name and typed arguments, or null if not matched
   *
   * @example
   * ```typescript
   * const decoded = contract.decodeEventLog(log);
   * if (decoded && decoded.name === 'Transfer') {
   *   const [from, to, amount] = decoded.args;
   *   console.log(`Transfer: ${from} -> ${to} (${amount})`);
   * }
   * ```
   */
  decodeEventLog(log: ContractLog): DecodedContractEvent | null {
    try {
      // Parse the log using ethers Interface
      const parsed = this.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (parsed === null) {
        return null;
      }

      return {
        name: parsed.name,
        args: [...parsed.args],
        topic: parsed.topic,
        blockNumber: log.blockNumber ?? null,
        transactionHash: log.transactionHash ?? null,
        logIndex: log.logIndex ?? null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all event names defined in the contract ABI.
   *
   * @returns Array of event names
   *
   * @example
   * ```typescript
   * const events = contract.getEventNames();
   * // ['Transfer', 'Approval', 'Mint', 'Burn']
   * ```
   */
  getEventNames(): string[] {
    const events: string[] = [];
    this.interface.forEachEvent((event) => {
      events.push(event.name);
    });
    return events;
  }

  /**
   * Get all error names defined in the contract ABI.
   *
   * @returns Array of error names
   *
   * @example
   * ```typescript
   * const errors = contract.getErrorNames();
   * // ['InsufficientBalance', 'Unauthorized', 'InvalidAmount']
   * ```
   */
  getErrorNames(): string[] {
    const errors: string[] = [];
    this.interface.forEachError((error) => {
      errors.push(error.name);
    });
    return errors;
  }

  /**
   * Get all function names defined in the contract ABI.
   *
   * @returns Array of function names
   *
   * @example
   * ```typescript
   * const functions = contract.getFunctionNames();
   * // ['transfer', 'approve', 'balanceOf', 'totalSupply']
   * ```
   */
  getFunctionNames(): string[] {
    const functions: string[] = [];
    this.interface.forEachFunction((fn) => {
      functions.push(fn.name);
    });
    return functions;
  }
}

/**
 * Type for read method proxies
 * Maps each view/pure function to an async function returning its output type
 *
 * @remarks
 * The TAbi parameter enables future type inference from ABI definitions.
 * Currently returns unknown for maximum flexibility.
 */
export type TypedContractReadMethods<TAbi extends Abi> = TAbi extends Abi
  ? Record<string, (...args: unknown[]) => Promise<unknown>>
  : never;

/**
 * Type for write method proxies
 * Maps each nonpayable/payable function to an async function requiring a signer
 *
 * @remarks
 * The TAbi parameter enables future type inference from ABI definitions.
 * Currently returns PendingContractTransaction for all write operations.
 */
export type TypedContractWriteMethods<TAbi extends Abi> = TAbi extends Abi
  ? Record<
      string,
      (signer: ContractSigner, ...args: unknown[]) => Promise<PendingContractTransaction>
    >
  : never;
