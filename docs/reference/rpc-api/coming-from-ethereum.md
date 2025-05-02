! content id="coming-from-ethereum"

## Coming from Ethereum

Coming from Ethereum, there are two important things to note:

**1. Pod extends Ethereum.**

**2. Pod is not a blockchain, and has no blocks.** There is no absolute ordering in Pod's transactions.

Currently, a core part of the standard [Ethereum RPC methods](https://ethereum.github.io/execution-apis/api-documentation/) under the `eth_` namespace works. Additionally, Pod introduces a few new methods, unique to Pod, under the `pod_` namespace.

Pod implements many of Ethereum's RPC methods but these methods below differ due to the lack of blocks in Pod.

| RPC Method | Functionality on Ethereum | Functionality on Pod |
|-------------------|-----------------------|-----------------------------|
| **eth_blockNumber** | Returns the number of the most recent block. | Returns the latest past perfection pod timestamp in microseconds. |
| **eth_getBlockByHash** | Returns information about a block by hash. | Returns an empty block structure. |
| **eth_getBlockByNumber** | Returns information about a block by number. | Returns an empty block structure. |

! content end

! content empty
