/**
 * Pod Network MEV-Free L1 & Alloy SDK Configuration
 */

export const POD_CONFIG = {
  network: {
    name: 'Pod Network L1 Financial Ledger',
    architecture: 'Alloy-Based Rust L1 Blockchain',
    orderingEngine: 'MEV-Free Fair Batch Ordering',
    wsEndpoint: 'wss://rpc.pod.network/ws',
    httpEndpoint: 'https://rpc.pod.network',
  },
  sdkComponents: [
    { name: 'PodProvider', type: 'Alloy Provider', description: 'Main entry point for submitting MEV-protected transactions & querying L1 state.' },
    { name: 'VerifiableLog', type: 'Cryptographic Log', description: 'Cryptographically verifiable event log proof engine for light client verification.' },
    { name: 'PodProviderBuilder', type: 'Configurator', description: 'Fluent builder pattern for configuring WebSocket and HTTP Pod RPC connections.' },
  ],
  sampleOrders: [
    {
      orderId: 'pod_order_eth_usdc_001',
      pair: 'ETH/USDC',
      side: 'BUY',
      size: '2.5 ETH',
      mevProtection: 'FAIR_BATCH_ORDERED_ZERO_FRONT RUN',
      status: 'VERIFIED_ON_POD_L1',
    },
    {
      orderId: 'pod_order_btc_usdc_002',
      pair: 'BTC/USDC',
      side: 'SELL',
      size: '0.5 BTC',
      mevProtection: 'FAIR_BATCH_ORDERED_ZERO_FRONT RUN',
      status: 'VERIFIED_ON_POD_L1',
    },
  ],
};
