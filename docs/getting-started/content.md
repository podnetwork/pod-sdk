---
title: Getting Started
layout: single

url: /getting-started

toc:
  network-configuration: Network Configuration
  wallet-setup: Wallet Setup
  obtaining-test-tokens: Obtaining Test Tokens
  verifying-your-setup: Verifying Your Setup
  additional-resources: Additional Resources
---

# Getting Started

This guide will help you set up your environment to interact pod network. We'll walk through the process of configuring your wallet and obtaining test tokens to begin development or testing.

! anchor network-configuration

## Network Configuration

Network parameters for connecting to pod:

- Network Name: pod
- RPC URL: https://rpc.dev.pod.network
- Chain ID: 1293
- Block Explorer URL: https://explorer.dev.pod.network/

For detailed information about available RPC methods and additional configuration options, please refer to our RPC API Documentation section.

! anchor wallet-setup

## Wallet Setup

To interact with pod, you'll need a Web3-compatible wallet. Popular options include MetaMask and Frame. Follow these steps to configure your wallet:

1. Open your Web3 wallet application
2. Navigate to the network management section (usually found in settings)
3. Select "Add Network" or "Add Custom Network"
4. Enter the network parameters provided above
5. Save your configuration

Your wallet should now be connected to pod. You can verify the connection by checking that your wallet displays the correct network name and chain ID.

! anchor obtaining-test-tokens

## Obtaining Test Tokens

To begin development or testing on pod, you'll need test tokens. Our faucet service provides these tokens free of charge:

1. Visit the faucet at https://faucet.dev.pod.network/
2. Connect your configured wallet or enter your wallet address
3. Request test tokens
4. Wait for the transaction to complete

Please note that faucet requests are rate-limited to ensure fair distribution of test tokens.

! anchor verifying-your-setup

## Verifying Your Setup

After completing the setup, you can verify everything is working correctly by:

1. Checking your wallet shows the correct network connection
2. Confirming your test token balance after using the faucet
3. Viewing your wallet address on our block explorer
4. Testing a small transaction if you have received test tokens

! anchor additional-resources

## Additional Resources

For more detailed information about specific topics, consult these documentation sections:

- [RPC API Documentation](/reference/rpc-api): For detailed information about available JSON-RPC methods.
- [How-To Guides](/how-to-guides/payments): For step-by-step instructions on common operations.
- [Architecture](/architecture/network): To learn more about pod.

! anchor getting-help

## Getting Help

If you encounter issues during setup or have questions about pod, please:

1. Use the block explorer to verify transaction status and history
2. Review the RPC documentation for proper endpoint usage

Remember to always verify you're using the correct network parameters and up-to-date software versions when troubleshooting connection issues.
