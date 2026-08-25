# Overview

Pod's protocol includes a set of asset-agnostic, fully on-chain, composable market primitives - the order book, matching engine, liquidation engine, and oracle system. These are enshrined as precompiles rather than deployed as user contracts. The primitives are general enough to support spot, perpetual futures, options, prediction markets, intent-based matching, and markets for exotic or illiquid assets.

## Why Pod Has No MEV

Transactions are added to the network without any central party - there is no leader or sequencer that controls which transactions are included or in what order. Confirmed transactions are batched and cleared at a single uniform price. Only transactions that were submitted in time can be part of a batch, and only transactions that were sufficiently early get to settle (i.e. claim funds if matched). This means competition happens on price alone - there are no timing or ordering advantages to exploit.

## Native Markets

Native markets are accessed through the [Orderbook precompile](orderbook.md). Users deposit funds into the orderbook contract and trade against a central limit order book (CLOB) with batch auction matching. Balances are unified across all native markets - a single deposit can be used for both spot and perpetual trading.

### Batch Settlement

Native markets settle in periodic batches. The batch duration is a single global setting shared by every market, currently 500ms. Within each batch, operations are processed in a fixed sequence:

1. **Deposits** - all deposit operations are processed first, ensuring funds are available before any trading activity.
2. **Order updates and cancellations** - modifications and cancellations are applied, updating the order book state.
3. **Liquidations** - liquidation checks and executions are performed against the updated book.
4. **Matching** - the matching engine runs the clearing algorithm over the resulting order book.
5. **Withdrawals** - withdrawal requests are processed last, after all trading and settlement is complete.

This ordering guarantees that deposited funds can be used for trading in the same batch, and that withdrawals only execute after all positions have been settled.

An accepted withdrawal leaves Pod: the balance is burned and becomes claimable on the chain the bridge is configured for, rather than moving to the withdrawer's Pod account. A withdrawal the balance does not cover at this point is refused - nothing is debited and the trader can resubmit. See [Native Bridge](native-bridge.md) for the claim flow and the [Orderbook precompile reference](https://docs.v2.pod.network/api-reference/applications-precompiles/orderbook) for the call itself.

The batch duration defines a tradeoff between fairness and latency of market settlement. Longer batches allow users with slower internet connections to participate, but markets settle slower - better for more illiquid markets. Shorter batches mean faster settlement but require lower latency to participate.

### Fees

Maker, taker, and liquidation fees are currently set to zero. This is subject to change in the future.

## Navigating the Docs

* [Order Book](orderbook.md) - the enshrined CLOB, order types, matching, and market data
* [JSON-RPC reference](https://docs.v2.pod.network/api-reference/json-rpc) - the `ob_*` methods (`ob_getMarkets`, `ob_getOrders`, `ob_getPositions`, …) used to read market state and order/position history
