#!/usr/bin/env tsx
/**
 * Error Lookup Script
 *
 * Look up information about pod SDK error codes.
 *
 * Usage:
 *   pnpm error:lookup POD_3004
 *   pnpm error:lookup 3004
 */

import { POD_ERRORS, ERROR_CODE_METADATA, type PodErrorCode } from "../packages/core/src/errors/codes.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";

function formatSeverity(severity: string): string {
  switch (severity) {
    case "critical":
      return `${RED}${BOLD}${severity}${RESET}`;
    case "error":
      return `${RED}${severity}${RESET}`;
    case "warning":
      return `${YELLOW}${severity}${RESET}`;
    case "info":
      return `${BLUE}${severity}${RESET}`;
    default:
      return severity;
  }
}

function formatRetryable(retryable: boolean): string {
  return retryable ? `${GREEN}yes${RESET}` : `${RED}no${RESET}`;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
${BOLD}Error Lookup${RESET}

Look up information about pod SDK error codes.

${BOLD}Usage:${RESET}
  pnpm error:lookup <code>
  pnpm error:lookup --list
  pnpm error:lookup --list <category>

${BOLD}Examples:${RESET}
  pnpm error:lookup POD_3004
  pnpm error:lookup 3004
  pnpm error:lookup --list
  pnpm error:lookup --list NETWORK

${BOLD}Categories:${RESET}
  NETWORK    - Network connection errors (1xxx)
  FUNDING    - Funding and gas errors (2xxx)
  EXECUTION  - Transaction and validation errors (3xxx)
  WALLET     - Wallet and signing errors (4xxx)
  AUCTION    - Auction-specific errors (5xxx)
  ORDERBOOK  - Orderbook-specific errors (6xxx)
`);
    process.exit(0);
  }

  // List all error codes
  if (args[0] === "--list") {
    const filterCategory = args[1]?.toUpperCase();
    const categories = new Map<string, Array<{ code: string; name: string; description: string }>>();

    for (const [key, code] of Object.entries(POD_ERRORS)) {
      const metadata = ERROR_CODE_METADATA[code as PodErrorCode];
      if (!metadata) continue;

      if (filterCategory && metadata.category !== filterCategory) continue;

      if (!categories.has(metadata.category)) {
        categories.set(metadata.category, []);
      }
      categories.get(metadata.category)!.push({
        code: code as string,
        name: key,
        description: metadata.description,
      });
    }

    if (categories.size === 0) {
      console.error(`${RED}No error codes found${filterCategory ? ` for category "${filterCategory}"` : ""}${RESET}`);
      process.exit(1);
    }

    for (const [category, errors] of categories) {
      console.log(`\n${BOLD}${category}${RESET}`);
      console.log("─".repeat(60));
      for (const error of errors) {
        console.log(`  ${CYAN}${error.code}${RESET}  ${error.name}`);
        console.log(`           ${error.description}`);
      }
    }
    console.log();
    process.exit(0);
  }

  // Look up a specific error code
  let codeInput = args[0];

  // Normalize input - add POD_ prefix if just a number
  if (/^\d+$/.test(codeInput)) {
    codeInput = `POD_${codeInput}`;
  }

  // Find the error code
  const metadata = ERROR_CODE_METADATA[codeInput as PodErrorCode];

  if (!metadata) {
    console.error(`${RED}Error code "${codeInput}" not found${RESET}`);
    console.log("\nAvailable error codes:");

    // Show similar codes
    const similar = Object.values(POD_ERRORS).filter((code) =>
      code.includes(codeInput.replace("POD_", ""))
    );
    if (similar.length > 0) {
      console.log(`  ${similar.slice(0, 5).join(", ")}`);
    }

    console.log("\nUse --list to see all error codes");
    process.exit(1);
  }

  // Display error information
  console.log();
  console.log(`${BOLD}${codeInput}${RESET}`);
  console.log("─".repeat(60));
  console.log(`  ${BOLD}Name:${RESET}        ${metadata.name}`);
  console.log(`  ${BOLD}Category:${RESET}    ${metadata.category}`);
  console.log(`  ${BOLD}Severity:${RESET}    ${formatSeverity(metadata.severity)}`);
  console.log(`  ${BOLD}Retryable:${RESET}   ${formatRetryable(metadata.retryable)}`);
  console.log();
  console.log(`  ${BOLD}Description:${RESET}`);
  console.log(`    ${metadata.description}`);
  console.log();
  console.log(`  ${BOLD}Suggestion:${RESET}`);
  console.log(`    ${metadata.suggestion}`);
  console.log();
}

main();
