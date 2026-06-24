import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The indexer REST (:8600) sends no CORS headers, so proxy /clob through the dev
// server: the browser calls same-origin and Vite forwards to the indexer.
const REST_TARGET = process.env.VITE_POD_REST_TARGET ?? "http://127.0.0.1:8600";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/clob": { target: REST_TARGET, changeOrigin: true },
    },
  },
});
