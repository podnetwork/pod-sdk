---
layout: single
---

## Precompiles

! table style1
| Signature                                              | Address                                    | Description                                                                    |
| ------------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------ |
| requireQuorum (boolean)                                | 0x4CF3F1637bfEf1534e56352B6ebAae243aF464c3 | Like `require` but passes if supermajority agrees                              |
| timestamp ()                                           | 0x423Bb123D9d5143e662606Fd343b6766d7BCf721 | Fetches the current system timestamp                                           |
| txInfo ()                                              | 0x7687A3413739715807812b529f2d5f7Ef9057697 | Fetches information about the current transaction (nonce and transaction hash) |
| external_call ([uint256, [Transaction,bytes]])         | 0x8712E00C337971f876621faB9326908fdF330d77 | Call a smart contract on another EVM-compatible chain                          |
| call_with_state ([uint256, Header, EVMCall, EVMState]) | 0xb4bbff8874b41f97535bc8dafbaaff0dc5c72e5a | Simulate an EVM transaction execution given a particular initial state         |
! table end

> We expect the devnet to have breaking changes or be reset (pruned completely) at any time. 