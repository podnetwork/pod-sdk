---
title: Welcome to pod
layout: single

url: /
---

! anchor welcome-to-pod
# Welcome to pod Documentation

**pod** is a programmable layer-one designed from first principles to 
enable internet-scale web3 applications. Traditional blockchains totally 
order transactions through consensus mechanisms, requiring multiple rounds 
of network communication and making them slow and expensive. pod doesn't totally 
order transactions, allowing it to **confirm transactions in one network round 
trip (\<150ms)** - the same speed as any traditional web2 client-server architecture. 

pod doesn't have blocks or chains. At a high level, transactions are streamed 
to a set of validators, which locally validate the transactions and stream 
the attestations back. Once the user receives a sufficient number 
of attestations, the transaction is finalised. Read more about the pod's 
design [here](https://pod.network/how-it-works). 

pod has a live devnet; you can view the live transactions in our 
[explorer](https://explorer.pod.network/) and find the network configuration and faucet [here](./devnet). pod supports 
EVMx, allowing developers to leverage their existing Ethereum developer 
toolchain. If you have experience building applications on Ethereum, 
this [cheat sheet](./overview) will help you get started with pod.

<br>

! gridstack
! grid href="./devnet"
## Devnet
Add devnet to your wallet and get test tokens.  
! grid end

! grid href="./overview"
## Coming from Ethereum?
Quick diff of RPC, Solidity, Foundry and Alloy.
! grid end

! grid href="./examples/tokens"
## Examples 
Learn by projects and examples.
! grid end

! gridstack end

! gridstack  
! grid href="/solidity-sdk"
## Solidity SDK
Learn how to write smart contracts for pod using Solidity.
! grid end  

! grid href="./json-rpc" 
## JSON-RPC
Learn about pod's JSON-RPC interface.
! grid end

! grid href="https://explorer.v1.pod.network"
## Explorer
Monitor network activity and accounts.  
! grid end
! gridstack end

