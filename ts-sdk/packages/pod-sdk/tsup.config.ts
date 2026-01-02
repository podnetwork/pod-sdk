import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    core: "src/core.ts",
    wallet: "src/wallet.ts",
    ws: "src/ws.ts",
    orderbook: "src/orderbook.ts",
    auction: "src/auction.ts",
    faucet: "src/faucet.ts",
    contracts: "src/contracts.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  treeshake: true,
  minify: false,
  target: "es2022",
  outDir: "dist",
});
