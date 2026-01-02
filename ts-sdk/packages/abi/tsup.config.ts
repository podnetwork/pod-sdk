import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "schemas/index": "src/schemas/index.ts",
    "types/index": "src/types/index.ts",
    "decode/index": "src/decode/index.ts",
    "encode/index": "src/encode/index.ts",
    "parse/index": "src/parse/index.ts",
    "utils/index": "src/utils/index.ts",
    "registry/index": "src/registry/index.ts",
    "lookup/index": "src/lookup/index.ts",
    "abis/index": "src/abis/index.ts",
    "abis/builtins/index": "src/abis/builtins/index.ts",
    "abis/common/index": "src/abis/common/index.ts",
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
  external: ["ethers", "@shazow/whatsabi"],
});
