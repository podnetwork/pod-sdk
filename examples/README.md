# Pod SDK Examples

## ⚠️ V1 Devnet Compatibility Note

Some examples in this directory have been updated to use standard Solidity patterns instead of Pod-specific primitives (`requireQuorum`, `requireTimeBefore`, `requireTimeAfter`, `FastTypes`) which are currently non-functional on V1 devnet (chainId 1293).

### Affected primitives and their replacements

- `requireQuorum(condition, msg)` → `require(condition, msg)`
- `requireTimeBefore(deadline, msg)` → `require(block.timestamp <= deadline, msg)`
- `requireTimeAfter(deadline, msg)` → `require(block.timestamp > deadline, msg)`
- `Time.Timestamp` → `uint256`
- `FastTypes.SharedCounter` → `mapping(bytes32 => uint256)`
- `FastTypes.OwnedCounter` → `mapping(bytes32 => mapping(address => bool))`
- `FastTypes.AddressSet` → `mapping(address => bool)`

### Updated examples

- `tokens/contracts/Tokens.sol`
- `notary/Notary.sol`
- `solidity/src/Voting.sol`

See [Issue #129](https://github.com/podnetwork/pod-sdk/issues/129) for details.
