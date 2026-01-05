import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
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
  external: [
    "react",
    "react-dom",
    "@radix-ui/react-dialog",
    "@radix-ui/react-popover",
    "@radix-ui/react-slot",
    "tailwindcss",
  ],
});
