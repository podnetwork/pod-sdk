// @pod-network/trade-sdk — read/stream market-data SDK for the pod indexer.

export { PodTradeClient } from "./client.js";
export type { PodTradeClientOptions } from "./client.js";
export type { MarketsCache } from "./sync/sources.js";

// Layer 1 — low-level transports (exposed for one-shot reads & debugging)
export { PodRestClient, PodHttpError } from "./transport/rest.js";
export type {
  MarketDynamicsPatch, MarketStatsPage, OrdersPage, BackstopPage, TriggersPage,
  CandlesPage, OrdersQueryRest, TriggersQueryRest, RestClientOptions,
} from "./transport/rest.js";
export { PodWsClient, PodSubscriptionClosedError } from "./transport/ws.js";
export type {
  Channel, SubParams, Subscription, ConnectionState, WsEvent, WebSocketCtor,
  WsClientOptions,
} from "./transport/ws.js";

// Layer 2 — resources
export type { Resource } from "./stores/resource.js";
export { combineResources, derivedResource } from "./stores/resource.js";
export { enrichPositions } from "./sync/positions-live.js";
export {
  accountMetrics, type AccountMetrics,
  perpPositionTotals, type PerpPositionTotals,
} from "./sync/account-metrics.js";
export {
  previewOrder, type OrderPreview, type OrderPreviewInput,
  closePreview, type ClosePreview,
  priceForReturn, type ReturnPriceInput,
  closestTriggers,
} from "./sync/order-preview.js";
export type { SeriesResource } from "./sync/candles.js";
export { CandleSeries } from "./sync/candles.js";
export { OrderHistory } from "./sync/orders.js";

// Framework-agnostic TradingView Charting Library datafeed (no React needed).
export { createPodDatafeed } from "./datafeed.js";

// Public data types
export * from "./types/public.js";

// Codec helpers
export {
  formatAmount, formatPrice, decimalsForTick, toNumber, parseAmount, dec, WAD, WAD_DECIMALS,
} from "./codec/units.js";
export {
  RESOLUTION_SECONDS, RESOLUTION_PAGE_BUCKETS, RESOLUTIONS, isResolution,
} from "./codec/resolution.js";

// Withdrawal amount arithmetic (ADR 0033). Read-side, so a UI can size and
// validate a withdrawal without pulling the signing entry.
export {
  withdrawStep, quantizeWithdrawAmount, toClaimAmount, toPodAmount,
  maxWithdrawable, checkWithdrawAmount, type WithdrawRejection, bridgeTokenFor,
} from "./codec/bridge.js";
// Following a withdrawal onto the claim chain.
export {
  fetchClaimStatus, waitForClaim, watchClaims, CLAIM_TOPIC,
  type ClaimStatus, type ClaimOutcome, type WaitForClaimOptions,
  type ClaimWatcher, type WatchClaimsOptions,
} from "./transport/claim.js";
// Only the options type: `WaitForClaimOptions` extends it, so declaration emit
// needs it public. The functions themselves stay internal.
export type { RpcOptions } from "./transport/jsonrpc.js";
