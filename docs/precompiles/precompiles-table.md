---
layout: full
---

! anchor precompiles-table
## Available Precompiles

! table style1
| Address                                    | Name                    | Minimum Gas  | Description                                                                    |
| ------------------------------------------ | ----------------------- | ------------ | ------------------------------------------------------------------------------ |
| 0x4CF3F1637bfEf1534e56352B6ebAae243aF464c3 | POD_REQUIRE_QUORUM      | 100          | Like `require` but passes if supermajority agrees                              |
| 0x423Bb123D9d5143e662606Fd343b6766d7BCf721 | POD_TIMESTAMP           | 100          | Fetches the current system timestamp                                           |
| 0x7687A3413739715807812b529f2d5f7Ef9057697 | POD_TX_INFO             | 100          | Fetches information about the current transaction (nonce and transaction hash) |
| 0x8712E00C337971f876621faB9326908fdF330d77 | POD_EXTERNAL_ETH_CALL   | 100          | Call a smart contract on another EVM-compatible chain                          |
| 0xb4bbff8874b41f97535bc8dafbaaff0dc5c72e5a | POD_EVM_CALL_WITH_STATE | 500          | Simulate an EVM transaction execution given a particular initial state         |
! table end
