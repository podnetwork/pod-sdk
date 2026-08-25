# @pod-network/trade-sdk

Read/stream market-data SDK for the pod trading indexer. It seeds initial values
from the cacheable REST API, then keeps everything live over **one multiplexed
WebSocket**, holds it in memory, and exposes it through a tiny, framework-agnostic
`Resource` abstraction. No polling.

> **Scope:** read/stream only. Order submission (nonce management, recovery) is a
> separate library — see `doc/ts-sdk-design.md`.

## Install

```bash
npm install @pod-network/trade-sdk
```

## Quick start

```ts
import { PodTradeClient } from "@pod-network/trade-sdk";

const client = new PodTradeClient({
  restUrl: "https://<indexer-rest-host>",  // /clob/* REST API (consumer config)
  wsUrl: "wss://<indexer-ws-host>",         // eth_subscribe WebSocket
});
client.connect();

const markets = client.markets;
const off = markets.subscribe(() => console.log(markets.get()));
await markets.ready();
```

## Framework bindings

The SDK ships no framework bindings — every resource is a `{ get(), subscribe(cb) }`
store, so it drops straight into React's `useSyncExternalStore`, Vue's
`shallowRef`, Svelte stores, etc.

```ts
// React, in one line — no provider, no library hook needed:
const ob = useSyncExternalStore(
  (cb) => client.orderbook(id, { depth: 20 }).subscribe(cb),
  () => client.orderbook(id, { depth: 20 }).get(),
);
```

## API surface

- **Layer 1 (low-level, exposed):** `client.rest.*` typed one-shot reads and
  `client.ws.subscribe(channel, params, onMessage)` raw subscriptions.
- **One-shot reads:** `client.candleHistory(id, resolution, range)` for chart
  history (resolves with the whole window or rejects — a partial answer is worse
  than an error, because a chart never re-asks) and `.candleTail(id, resolution,
  range)` for the still-forming bucket, plus `.leaderboard(query)`,
  `.transaction(hash)`.
- **Layer 2 (resources):** `client.status`, `.markets`, `.market(id)`,
  `.orderbook(id,{depth})`, `.positions(account)`, `.triggers(account)`,
  `.backstopTransfers(account)`, `.candles(id, resolution, range)` (a
  `SeriesResource` with `setWindow`/`loadOlder`), `.orders(account, query)`,
  `.bridgeConfig`, `.withdrawals(account)`.
- **Charting:** `createPodDatafeed(client)` returns an `IDatafeedChartApi`-shaped
  object for the TradingView Charting Library (framework-agnostic, no React).

All monetary values are `bigint` (1e18-scaled; use `formatAmount`/`toNumber`/
`parseAmount`); all timestamps are millisecond `number`s — with one deliberate
exception, `Withdrawal.timeUs`, which stays in **microseconds** because it is
also the resume cursor for `pod_withdrawals` and its REST backfill, both of which
compare it in micros. The `Us` suffix is the only marker, so treating it as
milliseconds silently reads a timestamp a thousand times too large.

## Withdrawals (ADR 0033 / 0036)

`withdraw` on the bridge precompile moves an orderbook balance straight to the
claim chain in **one** transaction — nothing is credited to a pod account on
the way, so there is no second signature and no half-finished state to recover.
The call is gas-exempt and must be signed by the **master wallet**: the bridge
has no delegation, so a session key cannot withdraw.

```ts
import { buildWithdraw, NATIVE_USD_ADDRESS } from "@pod-network/trade-sdk/write";
import { bridgeTokenFor, checkWithdrawAmount, maxWithdrawable } from "@pod-network/trade-sdk";

const config = await client.bridgeConfig.ready();
const token = bridgeTokenFor(config, NATIVE_USD_ADDRESS)!;

// Size it against the token's own rules before signing.
const amount = maxWithdrawable(balances.withdrawableCash, token);
const rejection = checkWithdrawAmount(amount, token); // undefined = admissible
if (rejection) return render(rejection); // e.g. a balance below the token's minimum

await masterWallet.submit(buildWithdraw({
  token: token.podToken,
  recipient,
  amount,
  // Required: admission refuses a deadline that is not a multiple of it.
  auctionIntervalUs: market.auctionIntervalMs * 1000,
}));
```

The rejection is checked rather than merely computed, because `maxWithdrawable`
returns `0n` for a balance below the token's minimum — so an unguarded path
submits an amount the node is certain to refuse.

`checkWithdrawAmount` returns a discriminated rejection (`{ code, … }`, each
variant carrying only the numbers its message needs) rather than a sentence — the
wording belongs to whatever renders it.

**`amount` stays in pod's 18 decimals but must be a whole number of claim-chain
units.** Whatever decimals the token uses on the claim chain become the
withdrawal granularity on pod, and the config's `min`/`max` are in those decimals
too — so where native USD maps to 6-decimal USDC, every withdrawal must be a
multiple of 1e12 wei. `maxWithdrawable` handles both; the builder deliberately
does no rounding of its own, because silently changing a signed amount is worse
than a clear rejection.

Track the outcome on `client.withdrawals(account)` (live, REST-backfilled),
matching on the id derived above. `error` is the **only** place a failure reason
exists: both `insufficient_balance` and `not_included` produce no L1 event at
all, so a client watching only the claim chain waits forever.

To confirm the funds actually landed, `waitForClaim({ restUrl, claimRpcUrl,
withdrawalId, bridge })` reads the withdrawal's claim state from pod and then
watches the claim chain for the bridge's `Claim` event carrying its hash. It
settles as `claimed` (with the L1 transaction), `refused` (rejected at execution
— nothing was debited, so the user can resubmit), or `pending` (timed out or
aborted, still in flight). Pass a `signal` to stop it.

Two things it handles that are easy to get wrong alone: the claim hash is
**fetched, never recomputed** — it folds in the pod chain id and the bridge
version, so a local copy silently stops matching after a version bump — and
`pending` is not `refused`, so a certificate that is merely still assembling
never reads as a dead withdrawal. Note `refused` is named for the *burn*, not for
claimability: it means nothing left the CLOB balance.

**Following more than one, use `watchClaims`.** `waitForClaim` is one loop per
withdrawal, and a UI tracking several pays that many times over. `watchClaims`
takes the same options minus the id, hands back `{ add, size, stop }`, and
reports each outcome through `onSettled` as it happens:

```ts
const claims = watchClaims({ restUrl, claimRpcUrl, bridge, onSettled: announce });
claims.add(withdrawalId, { lookbackBlocks: 200 });
```

The claim-chain half then costs the same whether one withdrawal is outstanding
or twenty, because a `Claim` topic filter is an OR set at `topics[1]` and one
`eth_getLogs` covers every hash. Stage 1 is still a REST read per unresolved id,
issued concurrently, so it is the log scan that stops scaling — not every request.

Each withdrawal keeps its **own** scan floor and the shared query starts at the
oldest of them, which is the one thing worth knowing when using it. A withdrawal
still waiting for its certificate contributes no hash to the query, but the
blocks passing meanwhile are exactly where its `Claim` may land — a relayer can
claim from a certificate this node has not finished assembling. So a floor is
raised only for an id whose hash was actually in the query that covered it.
`add` is idempotent while a withdrawal is outstanding but not after it settles —
the watcher forgets settled ids, so not re-announcing an outcome you already
acted on stays with the caller.

## How caching / low traffic works

- Each resource **seeds once** over REST, then lives off WS pushes — no polling.
- One WebSocket, ref-counted: N subscribers to the same market = one server
  subscription.
- Candle history is fetched as **epoch-anchored canonical pages** (per
  resolution), so settled pages are byte-identical across clients/time and the
  server flags them `immutable` — the browser/CDN serve them, the SDK never
  re-requests them. The forming bar is built in memory from the `pod_candles`
  tick stream, so the hot edge costs zero extra requests.

## Build

```bash
npm install && npm run build      # build the package to dist/
```

## Working on the SDK and a consumer together

The consumer's committed dependency is always the published version. To iterate
locally, link this package into it instead of editing that dependency:

```bash
cd ts-sdk && npm run build && npm link
cd ../../frontend && npm link @pod-network/trade-sdk
# undo
npm unlink @pod-network/trade-sdk && npm ci
```

`dist/` is what consumers import, so rebuild after each change. Nothing is
committed on either side, so a local path can never leak into a release.

## Releasing

Publishing is driven by a **`ts-sdk-v*`** tag, which is deliberately distinct
from the repo-wide `v*` tag that `release.yml` uses to zip every SDK into a
GitHub Release — so a TypeScript release doesn't drag `rust-sdk` along:

```bash
# 1. bump the version in package.json, commit it
# 2. tag it — the tag must match package.json or the job fails
git tag ts-sdk-v0.1.0 && git push origin ts-sdk-v0.1.0
```

`publish-ts-sdk.yml` then typechecks, builds and publishes to npm with
provenance. Two things worth knowing:

- A version containing a hyphen (`0.2.0-rc.0`) publishes under the **`rc`**
  dist-tag, leaving `latest` alone — so prereleases never become the default
  install. Use one to rehearse a release; npm versions can never be reused.
- `dist/` is gitignored and built during the release, and `prepublishOnly`
  rebuilds it on any manual `npm publish` too, so a stale or empty `dist/`
  can't ship.
