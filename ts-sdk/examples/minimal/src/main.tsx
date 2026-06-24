import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PodTradeClient } from "@pod-network/trade-sdk";
import { PodTradeProvider } from "@pod-network/trade-sdk/react";
import { App } from "./App.js";

const client = new PodTradeClient({
  // Same-origin: /clob is proxied to the indexer by Vite (see vite.config.ts),
  // which avoids the indexer's missing CORS headers in the browser.
  restUrl: import.meta.env.VITE_POD_REST_URL ?? "",
  wsUrl: import.meta.env.VITE_POD_WS_URL ?? "ws://127.0.0.1:8545",
});
client.connect();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PodTradeProvider client={client}>
      <App />
    </PodTradeProvider>
  </StrictMode>,
);
