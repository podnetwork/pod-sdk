/**
 * @module cli/compile
 * @description Solidity compilation utilities using Foundry
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { spawnSync } from "node:child_process";
import { FoundryNotInstalledError, CompilationFailedError } from "../errors/index.js";

/**
 * Result of Solidity compilation
 */
export interface CompilationResult {
  /** Path to the compiled artifact (JSON file) */
  artifactPath: string;
  /** Contract name extracted from the .sol file */
  contractName: string;
  /** Temporary directory (caller should clean up) */
  tempDir: string;
}

/**
 * Check if Foundry (forge) is installed and available.
 *
 * @returns true if forge is available
 */
export function isFoundryInstalled(): boolean {
  try {
    const result = spawnSync("forge", ["--version"], {
      stdio: "pipe",
      encoding: "utf-8",
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Get the Foundry version string.
 *
 * @returns Foundry version or null if not installed
 */
export function getFoundryVersion(): string | null {
  try {
    const result = spawnSync("forge", ["--version"], {
      stdio: "pipe",
      encoding: "utf-8",
    });
    if (result.status === 0 && result.stdout !== "") {
      return result.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract contract name from a Solidity file path.
 *
 * Uses the filename without extension as the contract name.
 *
 * @param solPath - Path to the .sol file
 * @returns Contract name
 */
export function extractContractName(solPath: string): string {
  const basename = path.basename(solPath);
  return basename.replace(/\.sol$/, "");
}

/**
 * Create a minimal Foundry project structure for compilation.
 *
 * @param tempDir - Temporary directory to create project in
 * @param solPath - Path to the source .sol file
 * @returns Path to the copied .sol file in the temp project
 */
function setupFoundryProject(tempDir: string, solPath: string): string {
  // Create src directory
  const srcDir = path.join(tempDir, "src");
  fs.mkdirSync(srcDir, { recursive: true });

  // Copy the .sol file to src/
  const filename = path.basename(solPath);
  const destPath = path.join(srcDir, filename);
  fs.copyFileSync(solPath, destPath);

  // Create minimal foundry.toml
  const foundryToml = `[profile.default]
src = "src"
out = "out"
libs = []
`;
  fs.writeFileSync(path.join(tempDir, "foundry.toml"), foundryToml);

  return destPath;
}

/**
 * Compile a Solidity file using Foundry.
 *
 * Creates a temporary Foundry project, compiles the contract,
 * and returns the path to the compiled artifact.
 *
 * @param solPath - Path to the .sol file to compile
 * @returns CompilationResult with artifact path and temp directory
 * @throws FoundryNotInstalledError if Foundry is not available
 * @throws CompilationFailedError if compilation fails
 *
 * @example
 * ```typescript
 * const result = await compileSolidityFile("./contracts/MyToken.sol");
 * try {
 *   const abi = extractAbiFromFile(result.artifactPath);
 *   // Use the ABI...
 * } finally {
 *   // Clean up temp directory
 *   fs.rmSync(result.tempDir, { recursive: true });
 * }
 * ```
 */
export function compileSolidityFile(solPath: string): CompilationResult {
  // Check if Foundry is installed
  if (!isFoundryInstalled()) {
    throw new FoundryNotInstalledError();
  }

  // Resolve absolute path
  const absoluteSolPath = path.resolve(solPath);

  // Verify file exists
  if (!fs.existsSync(absoluteSolPath)) {
    throw new CompilationFailedError(solPath, `File not found: ${absoluteSolPath}`);
  }

  // Extract contract name from filename
  const contractName = extractContractName(absoluteSolPath);

  // Create temporary directory for compilation
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pod-contracts-"));

  try {
    // Setup minimal Foundry project
    setupFoundryProject(tempDir, absoluteSolPath);

    // Run forge build
    const result = spawnSync("forge", ["build"], {
      cwd: tempDir,
      stdio: "pipe",
      encoding: "utf-8",
    });

    if (result.status !== 0) {
      const errorOutput =
        result.stderr !== ""
          ? result.stderr
          : result.stdout !== ""
            ? result.stdout
            : "Unknown error";
      throw new CompilationFailedError(solPath, errorOutput);
    }

    // Find the artifact
    const artifactPath = path.join(tempDir, "out", `${contractName}.sol`, `${contractName}.json`);

    if (!fs.existsSync(artifactPath)) {
      // Try to find any artifact in the out directory
      const outDir = path.join(tempDir, "out");
      if (fs.existsSync(outDir)) {
        const files = fs.readdirSync(outDir, { recursive: true }) as string[];
        const jsonFiles = files.filter((f) => f.endsWith(".json") && !f.includes("build-info"));
        if (jsonFiles.length > 0) {
          const firstArtifact = jsonFiles[0];
          if (firstArtifact !== undefined) {
            return {
              artifactPath: path.join(outDir, firstArtifact),
              contractName,
              tempDir,
            };
          }
        }
      }
      throw new CompilationFailedError(solPath, `Compiled artifact not found at ${artifactPath}`);
    }

    return {
      artifactPath,
      contractName,
      tempDir,
    };
  } catch (error) {
    // Clean up on error (but not for CompilationFailedError as caller may want to inspect)
    if (!(error instanceof CompilationFailedError)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
}

/**
 * Clean up a compilation result's temporary directory.
 *
 * @param result - CompilationResult to clean up
 */
export function cleanupCompilation(result: CompilationResult): void {
  try {
    fs.rmSync(result.tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
