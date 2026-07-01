# Minimal example

A single-page demo of `@pod-network/trade-sdk`: market selector, candlestick
chart (lightweight-charts), order book, market stats, and order history — all
read-only, wired through the React hooks. Two real files: `src/main.tsx` (mounts
the provider) and `src/App.tsx` (the whole page).

## Run

```bash
# from the SDK root, build the package first:
cd ../.. && npm install && npm run build

# then run the example:
cd examples/minimal && npm install
VITE_POD_REST_URL=https://<rest-host> VITE_POD_WS_URL=wss://<ws-host> npm run dev
```

By default REST is **same-origin** and Vite proxies `/clob` → the indexer (see
`vite.config.ts`, target `VITE_POD_REST_TARGET`, default `http://127.0.0.1:8600`).
This sidesteps the indexer's missing CORS headers in the browser. The WebSocket
(`VITE_POD_WS_URL`, default `ws://127.0.0.1:8545`) needs no proxy. The default
dev run is just:

```bash
npm run dev   # serves at http://127.0.0.1:5173, proxying /clob to :8600
```

## Seeding demo data (local devnet)

An empty book shows no depth/candles/history. To populate a local pod devnet
(minting enabled) with resting orders + crossing trades:

```bash
./scripts/seed-devnet.sh    # needs foundry `cast` + `gdate` (coreutils)
```

It funds two throwaway test accounts, posts a resting bid/ask ladder on the
NVDAx/USD market, and crosses a couple of orders to create fills. The maker
account it prints is pre-filled in the order-history box.
