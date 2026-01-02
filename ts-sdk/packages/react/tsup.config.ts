import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "hooks/index": "src/hooks/index.ts",
    "components/index": "src/components/index.ts",
    "utils/index": "src/utils/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  treeshake: true,
  minify: false,
  target: "es2022",
  outDir: "dist",
  external: ["react", "react-dom", "@radix-ui/react-slot"],
});
