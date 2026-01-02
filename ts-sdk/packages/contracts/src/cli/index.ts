/**
 * @module cli
 * @description CLI tool for extracting ABIs from build artifacts
 *
 * Usage:
 *   extract-abi <input> -o <output> [options]
 *
 * Examples:
 *   # Extract from Foundry artifact
 *   extract-abi ./out/MyContract.sol/MyContract.json -o ./abis/
 *
 *   # Batch extraction with glob
 *   extract-abi './out/**\/*.json' -o ./abis/
 */

import * as path from "node:path";
import { glob } from "glob";
import { extractAbiFromFile, isValidArtifactFile, fileExists } from "./extract.js";
import { writeAbiFile, writeBarrelFile, toFileName } from "./output.js";
import { compileSolidityFile, cleanupCompilation, type CompilationResult } from "./compile.js";
import {
  InvalidArtifactError,
  ContractError,
  FoundryNotInstalledError,
  CompilationFailedError,
} from "../errors/index.js";

// Exit codes per contracts/cli.md spec
const EXIT_CODES = {
  SUCCESS: 0,
  INVALID_ARGUMENTS: 1,
  NO_FILES_MATCHED: 2,
  ARTIFACT_PARSE_ERROR: 3,
  OUTPUT_DIR_ERROR: 4,
  FOUNDRY_NOT_INSTALLED: 5,
  COMPILATION_FAILED: 6,
} as const;

interface CliOptions {
  input: string;
  output: string;
  noBarrel: boolean;
  help: boolean;
  version: boolean;
}

function printHelp(): void {
  console.log(`
extract-abi - Extract ABIs from Foundry/Hardhat build artifacts or Solidity files

USAGE:
  extract-abi <input> -o <output> [options]

ARGUMENTS:
  <input>           File path or glob pattern to:
                    - .json artifact files (Foundry/Hardhat)
                    - .sol Solidity source files (requires Foundry)

OPTIONS:
  -o, --output      Output directory for generated files (required)
  --no-barrel       Skip generating index.ts barrel file
  -h, --help        Show this help message
  -v, --version     Show version number

EXAMPLES:
  # Single file extraction from artifact
  extract-abi ./out/MyContract.sol/MyContract.json -o ./abis/

  # Batch extraction with glob
  extract-abi './out/**/*.json' -o ./abis/

  # From Hardhat artifacts
  extract-abi './artifacts/contracts/**/*.json' -o ./abis/

  # Direct from Solidity source (compiles using Foundry)
  extract-abi ./contracts/MyToken.sol -o ./abis/

  # Batch Solidity compilation
  extract-abi './contracts/*.sol' -o ./abis/

EXIT CODES:
  0  Success
  1  Invalid arguments or options
  2  No files matched the glob pattern
  3  Artifact parsing error
  4  Output directory creation failed
  5  Foundry not installed (for .sol files)
  6  Solidity compilation failed
`);
}

function printVersion(): void {
  console.log("@podnetwork/contracts extract-abi v0.1.0");
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    input: "",
    output: "",
    noBarrel: false,
    help: false,
    version: false,
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === undefined) {
      i++;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "-v" || arg === "--version") {
      options.version = true;
    } else if (arg === "--no-barrel") {
      options.noBarrel = true;
    } else if (arg === "-o" || arg === "--output") {
      i++;
      const nextArg = args[i];
      if (nextArg === undefined) {
        console.error("Error: --output requires a directory path");
        process.exit(EXIT_CODES.INVALID_ARGUMENTS);
      }
      options.output = nextArg;
    } else if (arg.startsWith("-")) {
      console.error(`Error: Unknown option: ${arg}`);
      process.exit(EXIT_CODES.INVALID_ARGUMENTS);
    } else {
      // Positional argument is input
      if (options.input === "") {
        options.input = arg;
      } else {
        console.error("Error: Multiple input patterns provided. Use quotes around glob patterns.");
        process.exit(EXIT_CODES.INVALID_ARGUMENTS);
      }
    }

    i++;
  }

  return options;
}

async function main(): Promise<void> {
  // Skip first two args (node, script path)
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(EXIT_CODES.SUCCESS);
  }

  if (options.version) {
    printVersion();
    process.exit(EXIT_CODES.SUCCESS);
  }

  // Validate required arguments
  if (options.input === "") {
    console.error("Error: Input file or glob pattern is required");
    console.error("Usage: extract-abi <input> -o <output>");
    process.exit(EXIT_CODES.INVALID_ARGUMENTS);
  }

  if (options.output === "") {
    console.error("Error: Output directory is required (-o <output>)");
    console.error("Usage: extract-abi <input> -o <output>");
    process.exit(EXIT_CODES.INVALID_ARGUMENTS);
  }

  // Resolve input files
  let files: string[];

  // Check if it's a glob pattern or single file
  if (options.input.includes("*")) {
    // Glob pattern
    files = await glob(options.input, { nodir: true });
  } else if (fileExists(options.input)) {
    // Single file
    files = [options.input];
  } else {
    // Try as glob anyway in case it's escaped
    files = await glob(options.input, { nodir: true });
  }

  // Separate .sol files from .json artifacts
  const solFiles = files.filter((f) => f.endsWith(".sol"));
  const jsonFiles = files.filter((f) => f.endsWith(".json") && isValidArtifactFile(f));

  if (solFiles.length === 0 && jsonFiles.length === 0) {
    console.error(`Error: No files matched pattern '${options.input}'`);
    console.error(`
Did you mean to:
  - Run 'forge build' first to compile your contracts?
  - Check that the glob pattern is correct?
  - Provide .sol files for direct compilation?`);
    process.exit(EXIT_CODES.NO_FILES_MATCHED);
  }

  // Process files
  const existingNames = new Set<string>();
  const writtenFiles: string[] = [];
  let skippedCount = 0;
  const collisions: { original: string; renamed: string }[] = [];
  const compiledResults: CompilationResult[] = [];

  // Process .sol files first (compile them)
  for (const solFile of solFiles) {
    try {
      console.log(`Compiling: ${solFile}...`);
      const result = compileSolidityFile(solFile);
      compiledResults.push(result);

      // Extract ABI from compiled artifact
      const extracted = extractAbiFromFile(result.artifactPath);

      // Track collisions
      const originalName = toFileName(extracted.contractName);
      const beforeSize = existingNames.size;

      const writtenPath = writeAbiFile(extracted, options.output, existingNames);

      const afterSize = existingNames.size;
      const actualName = path.basename(writtenPath, ".ts");

      if (afterSize === beforeSize + 1 && actualName !== originalName) {
        collisions.push({ original: originalName, renamed: actualName });
      }

      writtenFiles.push(actualName);
      console.log(`Compiled & Extracted: ${solFile} → ${writtenPath}`);
    } catch (error) {
      if (error instanceof FoundryNotInstalledError) {
        console.error(`Error: ${error.message}`);
        if (error.suggestion !== undefined) {
          console.error(`\n${error.suggestion}`);
        }
        process.exit(EXIT_CODES.FOUNDRY_NOT_INSTALLED);
      } else if (error instanceof CompilationFailedError) {
        console.error(`Error: ${error.message}`);
        console.error(`\nCompiler output:\n${error.compilerOutput}`);
        process.exit(EXIT_CODES.COMPILATION_FAILED);
      } else if (error instanceof ContractError) {
        console.error(`Error: ${error.message}`);
        process.exit(EXIT_CODES.ARTIFACT_PARSE_ERROR);
      } else {
        throw error;
      }
    }
  }

  // Process .json artifacts
  for (const file of jsonFiles) {
    try {
      const extracted = extractAbiFromFile(file);

      // Track collisions
      const originalName = toFileName(extracted.contractName);
      const beforeSize = existingNames.size;

      const writtenPath = writeAbiFile(extracted, options.output, existingNames);

      const afterSize = existingNames.size;
      const actualName = path.basename(writtenPath, ".ts");

      if (afterSize === beforeSize + 1 && actualName !== originalName) {
        collisions.push({ original: originalName, renamed: actualName });
      }

      writtenFiles.push(actualName);
      console.log(`Extracted: ${file} → ${writtenPath}`);
    } catch (error) {
      if (error instanceof InvalidArtifactError) {
        console.log(`Skipped: ${file} (${error.message})`);
        skippedCount++;
      } else if (error instanceof ContractError) {
        console.error(`Error: ${error.message}`);
        process.exit(EXIT_CODES.ARTIFACT_PARSE_ERROR);
      } else {
        throw error;
      }
    }
  }

  // Clean up compiled temp directories
  for (const result of compiledResults) {
    cleanupCompilation(result);
  }

  // Warn about collisions
  if (collisions.length > 0) {
    console.log("\nWarning: Multiple contracts with same name found");
    for (const { original, renamed } of collisions) {
      console.log(`  ${original}.ts → ${renamed}.ts`);
    }
    console.log("Numeric suffixes added to avoid overwriting files.");
  }

  // Write barrel file
  if (!options.noBarrel && writtenFiles.length > 0) {
    writeBarrelFile(options.output, writtenFiles);
    console.log(`\nGenerated barrel: ${path.join(options.output, "index.ts")}`);
  }

  // Summary
  console.log(`\nProcessed: ${String(writtenFiles.length)} contracts`);
  if (skippedCount > 0) {
    console.log(`Skipped: ${String(skippedCount)} files`);
  }
  console.log(`Output: ${path.resolve(options.output)}`);

  process.exit(EXIT_CODES.SUCCESS);
}

main().catch((error: unknown) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
