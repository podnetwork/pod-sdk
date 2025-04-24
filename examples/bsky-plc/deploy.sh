#!/bin/bash

# Set DEPLOYER_PRIVATE_KEY to a key of a funded account that will pay for contract deployment
source .env


forge create DIDLastOperationRegistry.sol:DIDRegistry \
  --evm-version istanbul \
  --rpc-url $RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --gas-price 1gwei \
  --gas-limit 10000000 \
  --legacy \
  --broadcast \
  -v

