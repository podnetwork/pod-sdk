---
layout: simple
---

! content
! anchor devnet-config

! table style1 
| Name | pod |    |
| --------- | ----- | -- |
| RPC | https://rpc.v1.dev.pod.network | ! copy value="https://rpc.v1.dev.pod.network" |
| Chain ID | 1293 | ! copy value="https://rpc.v1.dev.pod.network" |
| Explorer | https://explorer.v2.pod.network | ! copy value="https://explorer.v2.pod.network" |
| EVM Version | Berlin (Ethereum block 12,244,000) | |
! table end   
! content end

! content 
! import $lib/components/pod/network-connect/network-connect.svelte
! content end