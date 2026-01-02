import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    minify: false,
    target: "es2022",
    outDir: "dist",
  },
  {
    entry: ["src/cli/index.ts"],
    format: ["esm"],
    dts: false,
    clean: false,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    minify: false,
    target: "es2022",
    outDir: "dist/cli",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
