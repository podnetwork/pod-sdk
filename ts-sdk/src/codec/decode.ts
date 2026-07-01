// Wire -> public decoders. The single place hex/decimal-string/microsecond
// representations are normalized into bigint + millisecond numbers.

import type {
  Bar, BackstopTransfer, Balances, LeaderboardEntry, LeaderboardPage, Market, Order,
  Orderbook, PartialFill, PerpPosition, Position, PositionsSnapshot, SpotHolding,
  SpotPosition, Status, Trigger, MarketType, OrderDirection, OrderKind, OrderStatus, TriggerType,
} from "../types/public.js";
import type {
  WireBackstopTransfer, WireBalances, WireCandle, WireLeaderboard, WireMarketDynamics,
  WireMarketStatic, WireOrder, WireOrderbook, WirePartialFill, WirePerpPosition, WirePosition,
  WirePositionsSnapshot, WireSpotHolding, WireSpotPosition, WireStatus, WireTrigger,
} from "../types/wire.js";
import { dec, decOpt, toNumber, usToMs, usToMsOpt } from "./units.js";

export function decodeStatus(w: WireStatus): Status {
  return { solutionNow: usToMs(w.solution_now) };
}

/** Static market identity. Dynamics are merged in later by the market store. */
export function decodeMarketStatic(w: WireMarketStatic): Market {
  return {
    id: w.id,
    name: w.name,
    type: w.market_type,
    base: { address: w.base_token_address, symbol: w.base_token_symbol, name: w.base_token_name },
    quote: { address: w.quote_token_address, symbol: w.quote_token_symbol, name: w.quote_token_name },
    tickPrecision: dec(w.tick_precision),
    lotSize: dec(w.lot_size),
    maxLeverage: w.max_leverage,
    fundingWindowUs: w.funding_window_us,
    makerFee: dec(w.maker_fee),
    takerFee: dec(w.taker_fee),
    auctionIntervalMs: usToMs(w.auction_interval_us),
  };
}

/** Dynamics fields (clearing/24h/perp) as a partial Market patch. */
export function decodeMarketDynamics(w: WireMarketDynamics): Partial<Market> & { id: string } {
  return {
    id: w.orderbook_id,
    lastClearingPrice: dec(w.last_clearing_price),
    volume24h: dec(w.volume_24h),
    high24h: dec(w.high_24h),
    low24h: dec(w.low_24h),
    priceChange24hBps: w.price_change_24h,
    oraclePrice: decOpt(w.oracle_price),
    markPrice: decOpt(w.mark_price),
    fundingRate: decOpt(w.funding_rate),
    fundingIndex: decOpt(w.funding_index),
    fundingLastUpdatedMs: usToMsOpt(w.funding_last_updated_us),
    openInterest: decOpt(w.open_interest),
  };
}

export function decodeCandle(w: WireCandle): Bar {
  return {
    time: usToMs(w.timestamp),
    open: dec(w.open),
    high: dec(w.high),
    low: dec(w.low),
    close: dec(w.close),
    volume: dec(w.volume),
    quoteVolume: dec(w.quote_volume),
  };
}

function decodePartialFill(w: WirePartialFill): PartialFill {
  return {
    base: dec(w.base_amount),
    quote: dec(w.quote_amount),
    price: dec(w.price),
    time: usToMs(w.timestamp),
  };
}

export function decodeOrder(w: WireOrder): Order {
  const initialSize = dec(w.initial_size);
  return {
    id: w.order_id,
    txHash: w.tx_hash,
    orderbookId: w.orderbook_id,
    marketType: w.market_type as MarketType | undefined,
    pair: w.pair ? { base: w.pair.base, quote: w.pair.quote } : undefined,
    // WS raw orders have no `side` field — derive it from the signed size.
    side: w.side ?? (initialSize < 0n ? "sell" : "buy"),
    orderType: w.order_type,
    status: w.status as OrderStatus,
    kind: w.kind as OrderKind,
    nonce: w.nonce,
    bidder: w.bidder,
    price: dec(w.price),
    initialSize,
    filledBase: dec(w.filled_base_amount),
    filledQuote: dec(w.filled_quote_amount),
    fee: dec(w.fee),
    effectivePrice: decOpt(w.effective_price),
    deadlineMs: usToMs(w.deadline),
    endMs: usToMs(w.end),
    includedMs: usToMsOpt(w.included_batch),
    fills: (w.fills ?? []).map(decodePartialFill),
    reduceOnly: w.reduce_only,
    ioc: w.ioc,
    direction: w.direction as OrderDirection | undefined,
    triggerType: (w.trigger_type ?? undefined) as TriggerType | undefined,
  };
}

export function decodeOrderbook(w: WireOrderbook): Orderbook {
  const id = (w.orderbook_id ?? w.clob_id)!;
  // Levels best-first; `total` is the cumulative size from the best price to here.
  const levels = (entries: [string, { volume: string }][], ascending: boolean) => {
    const sorted = entries
      .map(([price, t]) => ({ price: dec(price), volume: dec(t.volume) }))
      .sort((a, b) => (ascending ? (a.price < b.price ? -1 : a.price > b.price ? 1 : 0)
        : (b.price < a.price ? -1 : b.price > a.price ? 1 : 0)));
    let cum = 0n;
    const withTotal = sorted.map((l) => { cum += l.volume; return { price: l.price, volume: l.volume, total: cum }; });
    // `depth` = cumulative size as a 0..1 fraction of this side's total (the
    // deepest level → 1). Ready to use as a depth-bar width; no app-side scaling.
    const sideMax = cum;
    return withTotal.map((l) => ({ ...l, depth: sideMax > 0n ? Number(l.total) / Number(sideMax) : 0 }));
  };
  const bids = levels(Object.entries(w.buys), false);
  const asks = levels(Object.entries(w.sells), true);
  const bestBid = bids[0]?.price;
  const bestAsk = asks[0]?.price;
  const hasBoth = bestBid !== undefined && bestAsk !== undefined;
  const mid = hasBoth ? (bestBid + bestAsk) / 2n : undefined;
  const spread = hasBoth ? bestAsk - bestBid : undefined;
  const spreadPct = mid && mid > 0n && spread !== undefined ? (Number(spread) / Number(mid)) * 100 : undefined;
  return {
    id,
    timeMs: usToMs(w.timestamp),
    clearingPrice: decOpt(w.clearing_price),
    bids,
    asks,
    mid,
    spread,
    spreadPct,
    bidCount: w.buys_count,
    askCount: w.sells_count,
    groupingPrecision: dec(w.grouping_precision),
    oraclePrice: decOpt(w.oracle_price),
    fundingRate: decOpt(w.funding_rate),
    fundingIndex: decOpt(w.funding_index),
    fundingLastUpdatedMs: usToMsOpt(w.funding_last_updated),
  };
}

function decodeSpotPosition(w: WireSpotPosition): SpotPosition {
  return {
    kind: "spot",
    orderbookId: w.orderbook_id,
    token: w.token,
    balance: dec(w.balance),
    freeBalance: dec(w.free_balance),
    lockedBalance: dec(w.locked_balance),
    costBasis: dec(w.cost_basis),
    markPrice: dec(w.mark_price),
    unrealizedPnl: dec(w.unrealized_pnl),
    realizedPnl: dec(w.realized_pnl),
  };
}

function decodePerpPosition(w: WirePerpPosition): PerpPosition {
  return {
    kind: "perp",
    orderbookId: w.orderbook_id,
    side: w.side,
    size: dec(w.size),
    notional: dec(w.notional),
    entryPrice: dec(w.entry_price),
    markPrice: dec(w.mark_price),
    margin: dec(w.margin),
    leverage: toNumber(dec(w.leverage)), // wire is 1e18-scaled, not a plain int
    fundingAccrued: dec(w.funding_accrued),
    entryFunding: dec(w.entry_funding),
    liquidationPrice: dec(w.liquidation_price),
    unrealizedPnl: dec(w.unrealized_pnl),
    realizedPnl: dec(w.realized_pnl),
  };
}

function decodePosition(w: WirePosition): Position {
  return w.kind === "perp" ? decodePerpPosition(w) : decodeSpotPosition(w);
}

export function decodePositions(w: WirePositionsSnapshot): PositionsSnapshot {
  return {
    positions: w.positions.map(decodePosition),
    totalUnrealizedPnl: dec(w.total_unrealized_pnl),
    totalRealizedPnl: dec(w.total_realized_pnl),
    perpsEquity: dec(w.perps_equity),
    accountValue: dec(w.account_value),
    cash: dec(w.cash),
    withdrawableCash: dec(w.withdrawable_cash),
  };
}

export function decodeSpotHolding(w: WireSpotHolding): SpotHolding {
  return {
    orderbookId: w.orderbook_id,
    baseSymbol: w.base_symbol,
    quoteSymbol: w.quote_symbol,
    balance: dec(w.balance),
    freeBalance: dec(w.free_balance),
    lockedBalance: dec(w.locked_balance),
    costBasis: dec(w.cost_basis),
    markPrice: dec(w.mark_price),
    unrealizedPnl: dec(w.unrealized_pnl),
    realizedPnl: dec(w.realized_pnl),
  };
}

export function decodeBalances(w: WireBalances): Balances {
  return {
    holdings: w.balances.map(decodeSpotHolding),
    cash: dec(w.cash),
    withdrawableCash: dec(w.withdrawable_cash),
    netDeposits: dec(w.net_deposits),
  };
}

/** Decode a ranked-accounts page (REST `/clob/leaderboard`). `offset` makes the
 * ranks 1-based over the full ordering. PnL = unrealized + realized (the rank
 * key); `%` is suppressed to 0 when the basis (accountValue − unrealized) is dust. */
export function decodeLeaderboard(w: WireLeaderboard, offset = 0): LeaderboardPage {
  const entries: LeaderboardEntry[] = (w.ranked ?? []).map((r, i) => {
    const unrealizedPnl = dec(r.positions.total_unrealized_pnl);
    const realizedPnl = dec(r.positions.total_realized_pnl);
    const accountValue = dec(r.positions.account_value);
    const pnl = unrealizedPnl + realizedPnl;
    const basis = accountValue - unrealizedPnl;
    const absAv = accountValue < 0n ? -accountValue : accountValue;
    const safe = basis > 0n && absAv > 0n && basis * 1000n >= absAv * 5n; // basis ≥ 0.5% of |av|
    return {
      rank: offset + i + 1,
      account: r.account,
      accountValue,
      unrealizedPnl,
      realizedPnl,
      pnl,
      pnlPercent: safe ? (Number(pnl) / Number(basis)) * 100 : 0,
    };
  });
  return { entries, total: w.total ?? 0 };
}

export function decodeTrigger(w: WireTrigger): Trigger {
  return {
    orderbookId: w.orderbook_id,
    orderId: w.order_id,
    txHash: w.tx_hash,
    bidder: w.bidder,
    nonce: w.nonce,
    size: dec(w.size),
    limitPrice: dec(w.limit_price),
    triggerPrice: dec(w.trigger_price),
    triggerType: w.trigger_type as TriggerType,
    reduceOnly: w.reduce_only,
    ioc: w.ioc,
    deadlineMs: usToMs(w.deadline),
    endMs: usToMs(w.end),
  };
}

export function decodeBackstopTransfer(w: WireBackstopTransfer): BackstopTransfer {
  return {
    orderbookId: w.orderbook_id,
    size: dec(w.size),
    cash: dec(w.cash),
    markPrice: dec(w.mark_price),
    equity: dec(w.equity),
    time: usToMs(w.timestamp_us),
  };
}
