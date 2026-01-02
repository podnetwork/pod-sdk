#!/usr/bin/env tsx
/**
 * Error Documentation Generator
 *
 * Generates markdown documentation for all pod SDK error codes.
 *
 * Usage:
 *   pnpm error:docs > ERROR_CODES.md
 *   pnpm error:docs --format table
 *   pnpm error:docs --format list
 */

import { POD_ERRORS, ERROR_CODE_METADATA, type PodErrorCode } from "../packages/core/src/errors/codes.js";

type OutputFormat = "table" | "list";

interface ErrorInfo {
  code: string;
  name: string;
  description: string;
  suggestion: string;
  severity: string;
  retryable: boolean;
}

function main(): void {
  const args = process.argv.slice(2);

  let format: OutputFormat = "table";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--format" && args[i + 1]) {
      format = args[i + 1] as OutputFormat;
      i++;
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log(`
Error Documentation Generator

Generates markdown documentation for all pod SDK error codes.

Usage:
  pnpm error:docs                    Generate markdown table (default)
  pnpm error:docs --format table     Generate markdown table
  pnpm error:docs --format list      Generate markdown list

Output is printed to stdout. Redirect to a file:
  pnpm error:docs > ERROR_CODES.md
`);
      process.exit(0);
    }
  }

  // Group errors by category
  const categories = new Map<string, ErrorInfo[]>();

  for (const [key, code] of Object.entries(POD_ERRORS)) {
    const metadata = ERROR_CODE_METADATA[code as PodErrorCode];
    if (!metadata) continue;

    if (!categories.has(metadata.category)) {
      categories.set(metadata.category, []);
    }

    categories.get(metadata.category)!.push({
      code: code as string,
      name: key,
      description: metadata.description,
      suggestion: metadata.suggestion,
      severity: metadata.severity,
      retryable: metadata.retryable,
    });
  }

  // Sort categories
  const categoryOrder = ["NETWORK", "FUNDING", "EXECUTION", "WALLET", "AUCTION", "ORDERBOOK"];
  const sortedCategories = [...categories.entries()].sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a[0]);
    const bIndex = categoryOrder.indexOf(b[0]);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });

  // Generate output
  console.log("# pod SDK Error Codes\n");
  console.log("All pod SDK errors use the unified `POD_XXXX` code format for easy identification and handling.\n");
  console.log("## Code Ranges\n");
  console.log("| Range | Category | Description |");
  console.log("|-------|----------|-------------|");
  console.log("| 1xxx | NETWORK | Network and connection errors |");
  console.log("| 2xxx | FUNDING | Funding, gas, and faucet errors |");
  console.log("| 3xxx | EXECUTION | Transaction, validation, RPC, and WebSocket errors |");
  console.log("| 4xxx | WALLET | Wallet, key, and signing errors |");
  console.log("| 5xxx | AUCTION | Auction-specific errors |");
  console.log("| 6xxx | ORDERBOOK | Orderbook-specific errors |");
  console.log();

  for (const [category, errors] of sortedCategories) {
    const categoryName = getCategoryName(category);
    console.log(`## ${categoryName} (${category})\n`);

    if (format === "table") {
      printTable(errors);
    } else {
      printList(errors);
    }

    console.log();
  }
}

function getCategoryName(category: string): string {
  switch (category) {
    case "NETWORK":
      return "Network Errors";
    case "FUNDING":
      return "Funding Errors";
    case "EXECUTION":
      return "Execution Errors";
    case "WALLET":
      return "Wallet Errors";
    case "AUCTION":
      return "Auction Errors";
    case "ORDERBOOK":
      return "Orderbook Errors";
    default:
      return category;
  }
}

function printTable(errors: ErrorInfo[]): void {
  console.log("| Code | Name | Description | Retryable |");
  console.log("|------|------|-------------|-----------|");

  for (const error of errors) {
    const retryable = error.retryable ? "Yes" : "No";
    // Escape pipe characters in description
    const desc = error.description.replace(/\|/g, "\\|");
    console.log(`| \`${error.code}\` | ${error.name} | ${desc} | ${retryable} |`);
  }
}

function printList(errors: ErrorInfo[]): void {
  for (const error of errors) {
    console.log(`### \`${error.code}\` - ${error.name}\n`);
    console.log(`${error.description}\n`);
    console.log(`- **Severity:** ${error.severity}`);
    console.log(`- **Retryable:** ${error.retryable ? "Yes" : "No"}`);
    console.log(`- **Suggestion:** ${error.suggestion}`);
    console.log();
  }
}

main();
