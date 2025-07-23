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
| Explorer | https://explorer.v1.pod.network | ! copy value="https://explorer.v1.pod.network" |
| EVM Version | Prague (Ethereum block 22,431,084, Released May 7th, 2025) | |
! table end   
! content end

! content 
! import $lib/components/pod/network-connect/network-connect.svelte
! content end
