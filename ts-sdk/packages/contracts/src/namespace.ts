import type { Abi } from "abitype";
import { TypedContract, type Address, type TransactionSender } from "./contract.js";
import { DuplicateContractError, ContractNotFoundError } from "./errors/index.js";

/**
 * ContractsNamespace provides a registry for typed contracts
 *
 * Use this to register and manage contracts with full type inference.
 *
 * @example
 * ```typescript
 * const contracts = new ContractsNamespace(sender);
 *
 * // Register a contract
 * const token = contracts.add("myToken", "0x...", tokenAbi);
 *
 * // Get a registered contract
 * const contract = contracts.get("myToken");
 *
 * // Check if contract exists
 * if (contracts.has("myToken")) { ... }
 *
 * // List all registered contracts
 * const names = contracts.list();
 *
 * // Remove a contract
 * contracts.remove("myToken");
 * ```
 */
export class ContractsNamespace {
  /** Internal registry of contracts */
  private readonly registry = new Map<string, TypedContract>();

  /** Transaction sender for read/write calls */
  private readonly sender: TransactionSender;

  constructor(sender: TransactionSender) {
    this.sender = sender;
  }

  /**
   * Register a new contract
   *
   * @param name - Unique name for this contract instance
   * @param address - Contract deployment address
   * @param abi - Contract ABI (use `as const` for type inference)
   * @returns TypedContract instance for interacting with the contract
   * @throws DuplicateContractError if name is already registered
   *
   * @example
   * ```typescript
   * const token = contracts.add("usdc", "0x...", usdcAbi);
   * const balance = await token.read.balanceOf("0x...");
   * ```
   */
  add<TAbi extends Abi>(name: string, address: Address, abi: TAbi): TypedContract<TAbi> {
    if (this.registry.has(name)) {
      throw new DuplicateContractError(name);
    }

    const contract = new TypedContract(address, abi, this.sender);
    this.registry.set(name, contract);
    return contract;
  }

  /**
   * Get a registered contract by name
   *
   * @param name - Contract name used during registration
   * @returns TypedContract instance or undefined if not found
   *
   * @example
   * ```typescript
   * const token = contracts.get("usdc");
   * if (token) {
   *   const balance = await token.read.balanceOf("0x...");
   * }
   * ```
   */
  get(name: string): TypedContract | undefined {
    return this.registry.get(name);
  }

  /**
   * Get a registered contract by name, throwing if not found
   *
   * @param name - Contract name used during registration
   * @returns TypedContract instance
   * @throws ContractNotFoundError if contract is not registered
   *
   * @example
   * ```typescript
   * const token = contracts.getOrThrow("usdc");
   * const balance = await token.read.balanceOf("0x...");
   * ```
   */
  getOrThrow(name: string): TypedContract {
    const contract = this.registry.get(name);
    if (contract === undefined) {
      throw new ContractNotFoundError(name);
    }
    return contract;
  }

  /**
   * Check if a contract is registered
   *
   * @param name - Contract name to check
   * @returns true if contract is registered
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Remove a registered contract
   *
   * @param name - Contract name to remove
   * @returns true if contract was removed, false if not found
   */
  remove(name: string): boolean {
    return this.registry.delete(name);
  }

  /**
   * List all registered contract names
   *
   * @returns Array of registered contract names
   */
  list(): string[] {
    return [...this.registry.keys()];
  }

  /**
   * Get the number of registered contracts
   */
  get size(): number {
    return this.registry.size;
  }

  /**
   * Clear all registered contracts
   */
  clear(): void {
    this.registry.clear();
  }
}
