#!/usr/bin/env node

/**
 * Pod Network CLI
 */

import { defaultPodProvider } from '../src/core/pod-provider.js';
import { defaultVerifiableLogEngine } from '../src/core/verifiable-log.js';

const args = process.argv.slice(2);
const command = args[0] || 'help';

async function main() {
  switch (command.toLowerCase()) {
    case 'order': {
      const pair = args[1] || 'ETH/USDC';
      console.log(`\n⚡ Submitting MEV-Protected Order for '${pair}' via PodProvider...`);
      const ord = defaultPodProvider.submitOrder({ pair });
      console.log(`  Order ID:        ${ord.orderId}`);
      console.log(`  MEV Protection:  ${ord.mevProtection}`);
      console.log(`  TX Hash:         ${ord.txHash}`);
      console.log(`  Status:          ${ord.status}\n`);
      break;
    }

    case 'verify-log': {
      console.log('\n🔐 Verifying VerifiableLog Light Client Proof...');
      const proof = defaultVerifiableLogEngine.verifyLogProof({});
      console.log(`  Merkle Root:   ${proof.merkleRoot}`);
      console.log(`  Verification:  ${proof.proofVerification}\n`);
      break;
    }

    case 'studio': {
      console.log('\n🌐 Launching Pod Network Studio on :3430...');
      await import('../src/server/app.js');
      break;
    }

    default: {
      console.log(`
╔══════════════════════════════════════════════════════════════════╗
║               ⚡ POD NETWORK MEV-FREE L1 CLI                     ║
║   Alloy Rust SDK, PodProvider & VerifiableLog Proof Suite        ║
╚══════════════════════════════════════════════════════════════════╝

Commands:
  pod-cli order [pair]                  Submit MEV-protected order via PodProvider
  pod-cli verify-log                    Verify VerifiableLog cryptographic proof
  pod-cli studio                        Launch Interactive Web Studio on :3430
      `);
      break;
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
