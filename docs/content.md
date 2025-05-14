---
title: Welcome to pod
layout: single

url: /

toc:
  welcome-to-pod: Welcome to pod
  devnet-config: Devnet Configuration
---

! anchor welcome-to-pod
# Welcome to pod developer documentation
pod is a novel programmable distributed ledger that prioritizes performance and 
efficiency by implementing a unique approach to transaction processing and consensus. 
Instead of enforcing strict transaction ordering like traditional blockchains, 
pod allows transactions to have temporal flexibility while maintaining byzantine resilience.

! gridstack  

! grid href="https://pod.network/how-it-works"
## Design Principles 
Architecture and design principles.
! grid end  

! grid href="./examples" 
## Examples 
Learn by projects and examples.
! grid end

! grid href="https://explorer.v1.pod.network"
## Explorer
Monitor network activity and accounts.  
! grid end
! gridstack end

! gridstack
! grid href="https://explorer.v1.pod.network"
## Coming from Ethereum?
Quick diff of RPC, Solidity, Foundry and Alloy.
! grid end
! gridstack end

! anchor devnet-config
## Devnet 
The pod devnet is a test network for developers to experiment 
with the pod network. It is designed to be a sandbox for testing 
and development purposes, allowing developers to build and test 
their applications without the need for real assets or transactions.

[Add network to your wallet (make this a button)] 

! table style1 
| Name | pod |  
| --------- | ----- |
| RPC | https://rpc.dev.pod.network |  
| Chain ID | 1293 |
| Explorer | https://explorer.dev.pod.network |
| Faucet | https://faucet.dev.pod.network |
! table end   

> We expect the devnet to have breaking changes or be reset (pruned completely) at any time. 
