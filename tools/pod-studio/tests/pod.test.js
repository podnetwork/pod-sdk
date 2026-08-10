/**
 * Pod Network SDK Unit Tests
 */

import { defaultPodProvider } from '../src/core/pod-provider.js';
import { defaultVerifiableLogEngine } from '../src/core/verifiable-log.js';

async function runPodTests() {
  console.log('Testing Pod Network MEV-Free L1 Provider & VerifiableLog Proof Engine...');

  // 1. Submit MEV-Protected Order
  const ord = defaultPodProvider.submitOrder({ pair: 'ETH/USDC', side: 'BUY', amount: '2.5 ETH' });
  if (!ord.txHash || ord.status !== 'EXECUTED_MEV_FREE') {
    throw new Error('PodProvider MEV-free order submission failed');
  }

  // 2. Verify VerifiableLog Proof
  const proof = defaultVerifiableLogEngine.verifyLogProof({ txHash: ord.txHash });
  if (!proof.merkleRoot || proof.proofVerification !== 'LIGHT_CLIENT_PROOF_VALID') {
    throw new Error('VerifiableLog proof verification failed');
  }

  console.log(`✅ Pod Network MEV-Free Order Executed & VerifiableLog Proof Validated (${ord.orderId})!`);
}

runPodTests().catch(e => {
  console.error('❌ Pod Test Failed:', e);
  process.exit(1);
});
