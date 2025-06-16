---
title: Welcome to pod
layout: single

url: /

---
! anchor devnet-intro 
# Devnet 
The pod devnet is a test network for developers to experiment 
with the pod network. It is designed to be a sandbox for testing 
and development purposes, allowing developers to build and test 
their applications without the need for real assets or transactions.

! anchor devnet-config

## Configuration

! table style1 
| Name | pod |    |
| --------- | ----- | -- |
| RPC | https://rpc.v2.pod.network | ! copy value="https://rpc.v2.pod.network" |
| Chain ID | 1293 | ! copy value="https://rpc.v2.pod.network" |
| Explorer | https://explorer.v2.pod.network | ! copy value="https://explorer.v2.pod.network" |
| EVM Version | Berlin (Ethereum block 12,244,000) | |
! table end   

## Precompiles

! table style1
| Signature                                             | Address                                    | Description                                                            |
| ----------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------- |
| requireQuorum(boolean)                                | 0x4CF3F1637bfEf1534e56352B6ebAae243aF464c3 | Like `require` but passes if supermajority agrees                      |
| external_call([uint256, [Transaction,bytes]])         | 0x8712E00C337971f876621faB9326908fdF330d77 | Call a smart contract on another EVM-compatible chain                  |
| call_with_state([uint256, Header, EVMCall, EVMState]) | 0xb4bbff8874b41f97535bc8dafbaaff0dc5c72e5a | Simulate an EVM transaction execution given a particular initial state |
! table end

> We expect the devnet to have breaking changes or be reset (pruned completely) at any time. 
