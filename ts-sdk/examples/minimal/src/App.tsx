import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  createChart, CandlestickSeries,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from "lightweight-charts";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  accountMetrics, formatAmount, formatPrice, parseAmount, previewOrder, toNumber,
  type Address, type Bar, type Hash, type MarketId, type Order, type PerpPosition, type Resolution, type Trigger,
} from "@pod-network/trade-sdk";
import {
  useMarkets, useMarket, useCandles, useOrderbook, useOpenOrders, useOrdersPage, useLivePositions, useTriggers,
} from "@pod-network/trade-sdk/react";
import {
  buildSubmitOrder, buildCancelOrder, buildUpdateOrder, buildSubmitTrigger, buildCancelTrigger,
  sendRawTransaction, waitForReceipt, type PodTxRequest,
} from "@pod-network/trade-sdk/write";
import "./assets/app.css";

// --- demo wallet: a viem local-key account, LOCAL DEVNET ONLY (public test key).
// Same sendTransaction-style interface a real wallet (Privy/MetaMask) exposes.
const RPC_URL = import.meta.env.VITE_POD_RPC_URL ?? "http://127.0.0.1:8545";
const PRIVATE_KEY = (import.meta.env.VITE_DEMO_PRIVATE_KEY
  ?? "0x6646548e48811090fdebbc52cf1d2d64bd433dee99b1b0d3682feb982ef1d0a9") as `0x${string}`;
const podDevnet = defineChain({
  id: 1293, name: "pod devnet",
  nativeCurrency: { name: "pETH", symbol: "pETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});
const account = privateKeyToAccount(PRIVATE_KEY);
const wallet = createWalletClient({ account, chain: podDevnet, transport: http() });
const publicClient = createPublicClient({ chain: podDevnet, transport: http() });

// Prepare + sign with the wallet (wallet-specific), then let the SDK broadcast:
// sendRawTransaction preserves & decodes the CLOB revert reason that a
// high-level send would drop. Returns the tx hash once the node ACCEPTS it.
async function submit(tx: PodTxRequest): Promise<Hash> {
  const maxFeePerGas = await publicClient.getGasPrice();
  const prepared = await wallet.prepareTransactionRequest({ ...tx, account, chain: podDevnet, maxFeePerGas });
  const serialized = await wallet.signTransaction(prepared as never);
  return sendRawTransaction(RPC_URL, serialized);
}

// Send → wait for the receipt. `update` keeps the toast in its loading state
// from "submitted" until the receipt confirms (or the tx reverts on-chain).
async function submitConfirm(tx: PodTxRequest, update: (m: string) => void): Promise<string> {
  const hash = await submit(tx);
  update(`submitted ${hash.slice(0, 10)}… · confirming`);
  const receipt = await waitForReceipt(RPC_URL, hash);
  if (receipt.status === "reverted") throw new Error(`reverted on-chain (${hash.slice(0, 10)}…)`);
  return `confirmed ${hash.slice(0, 10)}…`;
}

// --- tiny toast: a module pub/sub + one <Toaster/>. notify() shows a pending
// toast and updates it to ok/err when the tx settles (auto-dismiss after 5s).
type Toast = { id: number; msg: string; kind: "pending" | "ok" | "err" };
let toasts: Toast[] = [];
const toastSubs = new Set<() => void>();
let toastSeq = 0;
function setToast(t: Toast) {
  const i = toasts.findIndex((x) => x.id === t.id);
  toasts = i >= 0 ? toasts.map((x) => (x.id === t.id ? t : x)) : [...toasts, t];
  toastSubs.forEach((f) => f());
  if (t.kind !== "pending") setTimeout(() => { toasts = toasts.filter((x) => x.id !== t.id); toastSubs.forEach((f) => f()); }, 5000);
}
// `run` reports its own progress via `update` (kept in the loading/pending
// state) and resolves to the final success message.
async function notify(msg: string, run: (update: (m: string) => void) => Promise<string>) {
  const id = ++toastSeq;
  const update = (m: string) => setToast({ id, msg: m, kind: "pending" });
  update(msg);
  try { setToast({ id, msg: await run(update), kind: "ok" }); }
  catch (e) { setToast({ id, msg: (e as { shortMessage?: string }).shortMessage ?? (e as Error).message, kind: "err" }); }
}
function Toaster() {
  const items = useSyncExternalStore((f) => { toastSubs.add(f); return () => { toastSubs.delete(f); }; }, () => toasts);
  return (
    <div className="toaster">
      {items.map((t) => (
        <div key={t.id} className={`toast toast--${t.kind}`}>
          {t.kind === "pending" ? "⏳ " : t.kind === "ok" ? "✓ " : "✕ "}{t.msg}
        </div>
      ))}
    </div>
  );
}
const ACCOUNT = account.address as Address; // the demo's fixed wallet address

// Insert thousands separators into a plain decimal string ("-1234.5" → "-1,234.5").
const group = (s: string) => {
  const neg = s.startsWith("-");
  const [w, f] = (neg ? s.slice(1) : s).split(".");
  return (neg ? "-" : "") + w.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (f !== undefined ? `.${f}` : "");
};
// Base-asset amounts (sizes/fills): fixed decimals, NO grouping, NO currency symbol.
const fmt = (v: bigint | undefined, p = 2) => (v === undefined ? "—" : formatAmount(v, 18, p, { trim: false }));
// Signed base amount (e.g. position size): no grouping, no symbol.
const signed = (v: bigint | undefined, p = 2) =>
  v === undefined ? "—" : (v < 0n ? "-" : "") + formatAmount(v < 0n ? -v : v, 18, p, { trim: false });
// USD amounts: "$" prefix + grouping + sign ("-$1,234.56").
const usd = (v: bigint | undefined, p = 2) =>
  v === undefined ? "—" : (v < 0n ? "-$" : "$") + group(formatAmount(v < 0n ? -v : v, 18, p, { trim: false }));
// USD from a JS number (trading-panel slider math).
const usdNum = (n: number, p = 0) => (n < 0 ? "-$" : "$") + group(n.toFixed(p));
// Prices: tick-derived decimals + grouping. `pxPlain` (no symbol) is used in the
// order book; `px` ("$" prefix) everywhere else.
const DEFAULT_TICK = 10_000_000_000_000_000n;
const pxPlain = (v: bigint | undefined, tick?: bigint) => (v === undefined ? "—" : group(formatPrice(v, tick ?? DEFAULT_TICK)));
const px = (v: bigint | undefined, tick?: bigint) => (v === undefined ? "—" : `$${pxPlain(v, tick)}`);
const pnlCls = (v?: bigint) => (v === undefined ? "flat" : v < 0n ? "down" : "up");

// Label a market even when only WS dynamics are loaded (no static name yet).
const marketLabel = (m: { id: string; name?: string; type?: string }) =>
  m.name ? `${m.name}${m.type ? ` (${m.type})` : ""}` : `${m.id.slice(0, 10)}…`;

export function App() {
  const markets = useMarkets();
  const [id, setId] = useState<MarketId | "">("");
  // On (re)load default to the first perp; if there are no perps, the first spot.
  // `id` is "" until the user picks one, so a refresh always re-applies this.
  const preferred =
    markets?.find((m) => m.type === "perp")?.id
    ?? markets?.find((m) => m.type === "spot")?.id
    ?? markets?.[0]?.id;
  const selected = id || preferred || "";

  return (
    <div className="app">
      <header className="header">
        <strong className="header__title">pod trade SDK</strong>
        <select className="input" value={selected} onChange={(e) => setId(e.target.value as MarketId)}>
          {!markets && <option>loading markets…</option>}
          {markets?.map((m) => <option key={m.id} value={m.id}>{marketLabel(m)}</option>)}
        </select>
        <span className="header__addr">demo wallet</span>
        <code className="addr">{ACCOUNT}</code>
      </header>

      <AccountSummary account={ACCOUNT} />
      {selected && <Stats id={selected as MarketId} />}

      <div className="main-grid">
        {selected && <Chart id={selected as MarketId} />}
        {selected && <OrderbookView id={selected as MarketId} />}
        {selected && <TradingPanel id={selected as MarketId} account={ACCOUNT} />}
      </div>

      <BottomTabs account={ACCOUNT} />
      <Toaster />
    </div>
  );
}

interface Card { label: string; value: string; sub?: string; cls?: string }

// Account summary cards (top row). Financial logic comes from accountMetrics.
function AccountSummary({ account }: { account: Address }) {
  const snap = useLivePositions(account);
  const m = snap ? accountMetrics(snap) : undefined;
  const pctStr = (p?: number) => (p === undefined ? "" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`);

  const cards: Card[] = [
    { label: "account value", value: usd(snap?.accountValue) },
    { label: "perps equity", value: usd(snap?.perpsEquity), sub: m && `eff. lev ${m.effectiveLeverage.toFixed(2)}x` },
    { label: "cash", value: usd(snap?.cash) },
    { label: "withdrawable", value: usd(snap?.withdrawableCash) },
    { label: "total P&L", value: usd(m?.totalPnl), sub: pctStr(m?.totalPnlPct), cls: pnlCls(m?.totalPnl) },
    { label: "unrealized P&L", value: usd(snap?.totalUnrealizedPnl), sub: pctStr(m?.unrealizedPnlPct), cls: pnlCls(snap?.totalUnrealizedPnl) },
    { label: "realized P&L", value: usd(snap?.totalRealizedPnl), cls: pnlCls(snap?.totalRealizedPnl) },
  ];
  return (
    <div className="panel row-wrap">
      {cards.map((c) => (
        <div key={c.label}>
          <div className="card__label">{c.label}</div>
          <div className={`card__value ${c.cls ?? ""}`}>{c.value}</div>
          {c.sub && <div className={`card__sub ${c.cls ?? ""}`}>{c.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function PositionsTable({ account }: { account: Address }) {
  const snap = useLivePositions(account);
  const markets = useMarkets();
  const marketOf = (orderbookId?: string) => (orderbookId ? markets?.find((x) => x.id === orderbookId) : undefined);
  const nameOf = (orderbookId?: string) =>
    marketOf(orderbookId)?.name ?? (orderbookId ? `${orderbookId.slice(0, 8)}…` : "—");
  if (!snap) return <div className="empty">…</div>;
  if (snap.positions.length === 0) return <div className="empty">no open positions</div>;
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>market</th><th>kind</th><th>size</th><th>entry</th><th>mark</th><th>notional</th>
          <th>margin</th><th>liq</th><th>funding</th><th>uPnL</th><th>rPnL</th>
        </tr>
      </thead>
      <tbody>
        {snap.positions.map((p, i) => {
          const t = marketOf(p.orderbookId)?.tickPrecision;
          return (
            <tr key={i}>
              <td>{nameOf(p.orderbookId)}</td>
              <td>{p.kind}{p.kind === "perp" ? ` ${p.side} ${p.leverage.toFixed(1)}x` : ""}</td>
              <td>{signed(p.kind === "perp" ? p.size : p.balance)}</td>
              <td>{p.kind === "perp" ? px(p.entryPrice, t) : px(p.costBasis, t)}</td>
              <td>{px(p.markPrice, t)}</td>
              <td>{p.kind === "perp" ? usd(p.notional) : "—"}</td>
              <td>{p.kind === "perp" ? usd(p.margin) : "—"}</td>
              <td>{p.kind === "perp" ? px(p.liquidationPrice, t) : "—"}</td>
              <td className={p.kind === "perp" ? pnlCls(p.fundingAccrued) : "flat"}>
                {p.kind === "perp" ? usd(p.fundingAccrued, 4) : "—"}
              </td>
              <td className={pnlCls(p.unrealizedPnl)}>{usd(p.unrealizedPnl)}</td>
              <td className={pnlCls(p.realizedPnl)}>{usd(p.realizedPnl)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Stats({ id }: { id: MarketId }) {
  const m = useMarket(id);
  const change = m?.priceChange24hBps;
  const t = m?.tickPrecision;
  const cells: [string, string][] = [
    ["clearing", px(m?.lastClearingPrice, t)],
    ["mark", px(m?.markPrice, t)],
    ["oracle", px(m?.oraclePrice, t)],
    ["24h vol", usd(m?.volume24h)],
    ["24h high", px(m?.high24h, t)],
    ["24h low", px(m?.low24h, t)],
    ["24h chg", change === undefined ? "—" : `${(change / 100).toFixed(2)}%`],
    ["funding", m?.fundingRate === undefined ? "—" : `${(toNumber(m.fundingRate) * 100).toFixed(4)}%`],
    ["open int.", usd(m?.openInterest)],
  ];
  return (
    <div className="panel row-wrap">
      {cells.map(([k, v]) => (
        <div key={k}>
          <div className="card__label">{k}</div>
          <div className="num">{v}</div>
        </div>
      ))}
    </div>
  );
}

const RESOLUTIONS: Resolution[] = ["1m", "5m", "15m", "1h", "4h", "1d"];
const LOOKBACK_MS: Record<Resolution, number> = {
  "1m": 6 * 3600e3, "5m": 24 * 3600e3, "15m": 3 * 24 * 3600e3,
  "30m": 7 * 24 * 3600e3, "1h": 14 * 24 * 3600e3, "4h": 60 * 24 * 3600e3,
  "1d": 365 * 24 * 3600e3, "1W": 3 * 365 * 24 * 3600e3, "1M": 5 * 365 * 24 * 3600e3,
};

function Chart({ id }: { id: MarketId }) {
  const [res, setRes] = useState<Resolution>("1m");
  const range = useMemo(() => ({ from: Date.now() - LOOKBACK_MS[res] }), [id, res]);
  const bars = useCandles(id, res, range);
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>();
  const seriesRef = useRef<ISeriesApi<"Candlestick">>();

  useEffect(() => {
    if (!elRef.current) return;
    // autoSize → the chart fills its (flex) container, so it matches the
    // stretched panel height instead of a fixed 360px.
    const chart = createChart(elRef.current, {
      autoSize: true,
      layout: { background: { color: "#14161b" }, textColor: "#9aa0ab" },
      grid: { vertLines: { color: "#1d2027" }, horzLines: { color: "#1d2027" } },
      timeScale: { timeVisible: true },
    });
    chartRef.current = chart;
    seriesRef.current = chart.addSeries(CandlestickSeries, {});
    return () => { chart.remove(); };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !bars) return;
    seriesRef.current.setData(bars.map((b: Bar) => ({
      time: Math.floor(b.time / 1000) as UTCTimestamp,
      open: toNumber(b.open), high: toNumber(b.high),
      low: toNumber(b.low), close: toNumber(b.close),
    })));
  }, [bars]);

  return (
    <div className="panel chart">
      <div className="chart__bar">
        {RESOLUTIONS.map((r) => (
          <button key={r} className={`chart__res${r === res ? " is-active" : ""}`} onClick={() => setRes(r)}>
            {r}
          </button>
        ))}
      </div>
      <div ref={elRef} className="chart__canvas" />
    </div>
  );
}

const OB_ROWS = 10; // levels shown per side — fixed, so the panel height never changes

type Lvl = { price: bigint; volume: bigint; total: bigint } | undefined;

function OrderbookView({ id }: { id: MarketId }) {
  const ob = useOrderbook(id, { depth: OB_ROWS });
  const t = useMarket(id)?.tickPrecision;
  const row = (l: Lvl, side: "ask" | "bid", key: string) => (
    <div key={key} className="ob-cols ob-row">
      {l ? (
        <>
          <span className={side === "ask" ? "ob-ask" : "ob-bid"}>{pxPlain(l.price, t)}</span>
          <span className="ob-size">{fmt(l.volume, 2)}</span>
          <span className="ob-total">{fmt(l.total, 2)}</span>
        </>
      ) : <span>&nbsp;</span>}
    </div>
  );
  const asks = ob?.asks.slice(0, OB_ROWS) ?? [];
  const bids = ob?.bids.slice(0, OB_ROWS) ?? [];
  // Pad to a fixed slot count: empties at the top for asks / bottom for bids,
  // so the best ask & best bid sit against the divider and total height is fixed.
  const askSlots: Lvl[] = [...Array(OB_ROWS - asks.length).fill(undefined), ...asks.slice().reverse()];
  const bidSlots: Lvl[] = [...bids, ...Array(OB_ROWS - bids.length).fill(undefined)];
  return (
    <div className="panel">
      <div className="ob-cols ob-head">
        <span>price</span><span className="ob-size">size</span><span className="ob-total">total</span>
      </div>
      {askSlots.map((l, i) => row(l, "ask", `a${i}`))}
      <div className="ob-mid">
        <span>mid {ob?.mid !== undefined ? pxPlain(ob.mid, t) : "—"}</span>
        <span className="muted">
          spread {ob?.spread !== undefined ? pxPlain(ob.spread, t) : "—"}{ob?.spreadPct !== undefined ? ` (${ob.spreadPct.toFixed(3)}%)` : ""}
        </span>
      </div>
      {bidSlots.map((l, i) => row(l, "bid", `b${i}`))}
    </div>
  );
}

function TradingPanel({ id, account }: { id: MarketId; account: Address }) {
  const market = useMarket(id);
  const snap = useLivePositions(account);
  const ob = useOrderbook(id, { depth: OB_ROWS }); // shares the order book's resource (same depth)
  const [side, setSide] = useState<"long" | "short">("long");
  const [type, setType] = useState<"market" | "limit">("market");
  const [limitPrice, setLimitPrice] = useState("");
  const [lev, setLev] = useState(0); // target leverage (0 .. maxLeverage)
  const [tpPrice, setTpPrice] = useState("");
  const [slPrice, setSlPrice] = useState("");

  // Only gate on the market (its static config). Positions (`snap`) load
  // independently — the order-entry UI renders without them; just the margin/
  // size figures and the submit button wait on `snap`.
  if (!market || !market.base) return <div className="panel">trade — loading market…</div>;

  const mid = ob?.mid;
  // Perp → long/short; spot → buy/sell. The fired action and labels follow this.
  const isPerp = market.type === "perp";
  const base = market.base.symbol;
  const verb = side === "long" ? (isPerp ? "long" : "buy") : (isPerp ? "short" : "sell");
  // Limit uses the typed price; a market order prices off the side it would hit
  // (best ask to buy / best bid to sell) — a spot book is often one-sided, so a
  // mid-only reference would be undefined and block the order. Falls back to
  // mid, then mark/clearing.
  const hitSide = side === "long" ? ob?.asks[0]?.price : ob?.bids[0]?.price;
  const ref = hitSide ?? mid ?? market.markPrice ?? market.lastClearingPrice ?? 0n;
  const price = type === "limit" && limitPrice ? parseAmount(limitPrice) : ref;

  // The slider is LEVERAGE (0 .. maxLev), not a fixed notional. Notional is
  // derived from the *current* free margin each render — notional = lev ·
  // availableMargin — so size scales with equity and can never exceed what the
  // margin supports (lev ≤ maxLev ⟹ notional ≤ availableMargin · maxLev = max
  // notional). Spot has no leverage, so maxLev = 1 (full = all cash).
  const maxLev = isPerp ? (market.maxLeverage || 1) : 1;
  // Position-dependent preview. Until `snap` (positions) arrives it's undefined —
  // the rows show "—" and submit is disabled, but the rest of the panel works.
  const base0 = snap ? previewOrder(snap, market, { side, price, notional: 0n }) : undefined;
  // notional = lev × free margin. Going bigint→float→bigint can round the
  // notional up a hair at the top of the slider, tipping marginRequired just
  // over available; clamp to the SDK's maxNotional, which is exactly affordable.
  const wantNotional = parseAmount((lev * toNumber(base0?.availableMargin ?? 0n)).toFixed(2));
  const notional = base0 && wantNotional > base0.maxNotional ? base0.maxNotional : wantNotional;
  const effUsd = toNumber(notional);
  const preview = snap ? previewOrder(snap, market, { side, price, notional }) : undefined;

  const rows: [string, string][] = [
    ["available margin", usd(preview?.availableMargin)],
    ["margin required", usd(preview?.marginRequired)],
    ["notional", snap ? usd(notional) : "—"],
    ["order size", preview ? fmt(preview.size < 0n ? -preview.size : preview.size, 4) : "—"], // base asset, no $
  ];
  const disabled = !preview || !preview.sufficientMargin || lev <= 0 || price <= 0n;

  // Build the unsigned tx with the SDK, then sign + send with the demo wallet.
  // The order then shows up live in the order book + history via the read SDK.
  const send = () => {
    if (!preview) return;
    const tx = buildSubmitOrder({
      orderbookId: id,
      side: side === "long" ? "buy" : "sell",
      orderType: type,
      price,
      tickPrecision: market.tickPrecision,
      auctionIntervalUs: market.auctionIntervalMs * 1000,
      size: preview.size < 0n ? -preview.size : preview.size,
    });
    notify(`${side === "long" ? "Buy" : "Sell"} ${market.name} (${usdNum(effUsd)})`, (u) => submitConfirm(tx, u));
  };

  // TP/SL arms a position-grouped, reduce-only trigger that closes the open
  // perp position (opposite side, full size) when mark crosses the level.
  const position = snap?.positions.find((p): p is PerpPosition => p.kind === "perp" && p.orderbookId === id && p.size !== 0n);
  const armTrigger = (kind: "take_profit" | "stop_loss", priceStr: string) => {
    if (!position || !priceStr) return;
    const tx = buildSubmitTrigger({
      orderbookId: id,
      side: position.side === "long" ? "sell" : "buy", // close side
      size: position.size < 0n ? -position.size : position.size,
      triggerType: kind,
      triggerPrice: parseAmount(priceStr),
      tickPrecision: market.tickPrecision,
      auctionIntervalUs: market.auctionIntervalMs * 1000,
    });
    notify(`${kind === "take_profit" ? "TP" : "SL"} ${market.name} @ ${priceStr}`, (u) => submitConfirm(tx, u));
  };

  return (
    <div className="panel">
      <div className="tp__label">trade {market.name}</div>
      <div className="tp__sides">
        <button className={`tab tab--long${side === "long" ? " is-active" : ""}`} onClick={() => setSide("long")}>{isPerp ? "long" : "buy"}</button>
        <button className={`tab tab--short${side === "short" ? " is-active" : ""}`} onClick={() => setSide("short")}>{isPerp ? "short" : "sell"}</button>
      </div>
      <div className="tabs">
        <button className={`tab${type === "market" ? " is-active" : ""}`} onClick={() => setType("market")}>market</button>
        <button className={`tab${type === "limit" ? " is-active" : ""}`} onClick={() => setType("limit")}>limit</button>
      </div>
      {type === "limit" && (
        <div className="tp__limit">
          <input
            className="input"
            style={{ flex: 1, minWidth: 0 }}
            placeholder="limit price"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value.trim())}
          />
          <button
            className="tab tab--auto"
            disabled={mid === undefined}
            onClick={() => mid !== undefined && setLimitPrice(formatPrice(mid, market.tickPrecision))}
            title="set to mid price"
          >
            mid
          </button>
        </div>
      )}
      <div className="tp__notional">
        <span>leverage</span>
        <span>
          {lev.toFixed(1)}x / {maxLev}x{" "}
          <button className="link-btn" onClick={() => setLev(maxLev)} title="max leverage">max</button>
        </span>
      </div>
      <input
        className="tp__slider"
        type="range" min={0} max={maxLev} step={maxLev / 100}
        value={lev}
        onChange={(e) => setLev(Number(e.target.value))}
      />
      <div className="tp__rows">
        {rows.map(([k, v]) => (
          <div key={k}><span className="muted">{k}</span><span>{v}</span></div>
        ))}
      </div>
      {/* TP/SL is perp-only; show it above the action button. */}
      {isPerp && (position ? (
        <div className="tpsl">
          <div className="tpsl__label">TP / SL — reduce {position.side} {fmt(position.size < 0n ? -position.size : position.size, 4)}</div>
          <div className="tp__limit">
            <input className="input cell-input" placeholder="take-profit price" value={tpPrice} onChange={(e) => setTpPrice(e.target.value.trim())} />
            <button className="tab tab--auto" disabled={!tpPrice} onClick={() => armTrigger("take_profit", tpPrice)}>arm TP</button>
          </div>
          <div className="tp__limit">
            <input className="input cell-input" placeholder="stop-loss price" value={slPrice} onChange={(e) => setSlPrice(e.target.value.trim())} />
            <button className="tab tab--auto" disabled={!slPrice} onClick={() => armTrigger("stop_loss", slPrice)}>arm SL</button>
          </div>
        </div>
      ) : (
        <div className="tpsl__label">TP / SL — open a {market.name} position to arm</div>
      ))}
      <button className={`submit-btn submit-btn--${side}`} disabled={disabled} onClick={send}>
        {verb} {base}
      </button>
      {preview && !preview.sufficientMargin && effUsd > 0 && <div className="tp__warn">insufficient margin</div>}
    </div>
  );
}

function OrderRows({ orders, triggers, empty }: { orders: Order[]; triggers?: Trigger[]; empty: string }) {
  const markets = useMarkets();
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null); // order id in edit mode
  const [draftPrice, setDraftPrice] = useState("");
  const [draftSize, setDraftSize] = useState("");
  // Resolve the market by orderbookId (REST orders) or by token pair (WS orders).
  const marketOf = (o: Order) => {
    if (o.orderbookId) { const m = markets?.find((x) => x.id === o.orderbookId); if (m) return m; }
    return o.pair
      ? markets?.find((m) =>
          m.base.address.toLowerCase() === o.pair!.base.toLowerCase() &&
          m.quote.address.toLowerCase() === o.pair!.quote.toLowerCase())
      : undefined;
  };
  const marketById = (obId?: string) => (obId ? markets?.find((m) => m.id === obId) : undefined);
  const assetOf = (o: Order) => marketOf(o)?.name ?? (o.orderbookId ? `${o.orderbookId.slice(0, 8)}…` : "—");
  const cancel = async (o: Order) => {
    const m = marketOf(o);
    if (!m) return;
    setBusy(o.id);
    await notify(`Cancel ${m.name} order`, (u) => submitConfirm(buildCancelOrder(m.id, o.id, { auctionIntervalUs: m.auctionIntervalMs * 1000 }), u));
    setBusy(null);
  };
  const startEdit = (o: Order) => {
    const m = marketOf(o);
    setEditing(o.id);
    setDraftPrice(m ? formatPrice(o.price, m.tickPrecision) : formatAmount(o.price, 18, 4));
    setDraftSize(formatAmount(o.initialSize < 0n ? -o.initialSize : o.initialSize, 18, 4));
  };
  // Amend price/size in place via the CLOB's native `update` (keeps the order id);
  // the open-orders stream patches the row live, history via the live overlay.
  const applyEdit = async (o: Order) => {
    const m = marketOf(o);
    if (!m) return;
    setBusy(o.id);
    const tx = buildUpdateOrder({
      orderbookId: m.id,
      orderId: o.id,
      price: parseAmount(draftPrice),
      size: parseAmount(draftSize),
      token: m.quote.address, // engine derives side/token from the resting order
      tickPrecision: m.tickPrecision,
      auctionIntervalUs: m.auctionIntervalMs * 1000,
    });
    await notify(`Edit ${m.name} order`, (u) => submitConfirm(tx, u));
    setBusy(null);
    setEditing(null);
  };
  const cancelTrig = async (t: Trigger) => {
    const m = marketById(t.orderbookId);
    if (!m) return;
    setBusy(t.orderId);
    const kind = t.triggerType === "take_profit" ? "TP" : "SL";
    await notify(`Cancel ${m.name} ${kind}`, (u) => submitConfirm(buildCancelTrigger(m.id, t.orderId, { auctionIntervalUs: m.auctionIntervalMs * 1000 }), u));
    setBusy(null);
  };

  // Merge armed triggers in as their own rows. A fired trigger reuses its
  // order_id and shows up in `orders` with kind "triggered", so drop any armed
  // trigger whose id already appears as an order (covers stream lag). Group by
  // market, orders before their armed triggers → TP/SL sit under the market.
  const orderIds = new Set(orders.map((o) => o.id));
  const armed = (triggers ?? []).filter((t) => !orderIds.has(t.orderId));
  type Row = { key: string; mkt: string; order?: Order; trigger?: Trigger };
  const rows: Row[] = [
    ...orders.map((o) => ({ key: o.id, mkt: assetOf(o), order: o })),
    ...armed.map((t) => ({ key: t.orderId, mkt: marketById(t.orderbookId)?.name ?? `${t.orderbookId.slice(0, 8)}…`, trigger: t })),
  ];
  rows.sort((a, b) => (a.mkt < b.mkt ? -1 : a.mkt > b.mkt ? 1 : (a.order ? 0 : 1) - (b.order ? 0 : 1)));

  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <table className="tbl">
      <thead>
        <tr><th>market</th><th>side</th><th>type</th><th>price</th><th>size</th><th>filled</th><th>status</th><th></th></tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          if (r.trigger) {
            const t = r.trigger;
            const tick = marketById(t.orderbookId)?.tickPrecision;
            const tside = t.size < 0n ? "sell" : "buy";
            return (
              <tr key={r.key} className="trigger-row">
                <td>{r.mkt}</td>
                <td className={tside === "buy" ? "up" : "down"}>{tside}</td>
                <td>{t.triggerType === "take_profit" ? "TP trigger" : "SL trigger"}</td>
                <td title={`fires at ${px(t.triggerPrice, tick)}, limit ${px(t.limitPrice, tick)}`}>▸ {px(t.triggerPrice, tick)}</td>
                <td>{fmt(t.size < 0n ? -t.size : t.size, 2)}</td>
                <td>—</td>
                <td>armed</td>
                <td style={{ textAlign: "right" }}>
                  <button className="cancel-btn" disabled={busy === t.orderId} onClick={() => cancelTrig(t)}>cancel</button>
                </td>
              </tr>
            );
          }
          const o = r.order!;
          const isEditing = editing === o.id;
          const tick = marketOf(o)?.tickPrecision;
          const trig = o.kind === "triggered" ? (o.triggerType === "take_profit" ? " (TP)" : " (SL)") : "";
          return (
            <tr key={r.key}>
              <td>{assetOf(o)}</td>
              <td className={o.side === "buy" ? "up" : "down"}>{o.side}</td>
              <td>{o.orderType}{trig}</td>
              <td>{isEditing
                ? <input className="input cell-input" value={draftPrice} onChange={(e) => setDraftPrice(e.target.value.trim())} />
                : px(o.price, tick)}</td>
              <td>{isEditing
                ? <input className="input cell-input" value={draftSize} onChange={(e) => setDraftSize(e.target.value.trim())} />
                : fmt(o.initialSize < 0n ? -o.initialSize : o.initialSize, 2)}</td>
              <td>{fmt(o.filledBase, 2)}</td>
              <td>{o.status}</td>
              <td style={{ textAlign: "right" }}>
                {o.status === "active" && (isEditing ? (
                  <>
                    <button className="link-btn" disabled={busy === o.id} onClick={() => applyEdit(o)}>save</button>{" "}
                    <button className="link-btn" onClick={() => setEditing(null)}>✕</button>
                  </>
                ) : (
                  <>
                    <button className="link-btn" disabled={busy === o.id} onClick={() => startEdit(o)}>edit</button>{" "}
                    <button className="cancel-btn" disabled={busy === o.id} onClick={() => cancel(o)}>cancel</button>
                  </>
                ))}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Pager({ page, hasPrev, hasNext, prev, next, note }: {
  page: number; hasPrev: boolean; hasNext: boolean; prev: () => void; next: () => void; note?: string;
}) {
  return (
    <div className="pager">
      <button disabled={!hasPrev} onClick={prev}>‹ prev</button>
      <span>page {page + 1}{note ? ` · ${note}` : ""}</span>
      <button disabled={!hasNext} onClick={next}>next ›</button>
    </div>
  );
}

// Open orders: active orders (paginated) + armed TP/SL triggers, both from the
// library. Triggers render once (on page 0) so they aren't repeated per page.
function OpenOrders({ account }: { account: Address }) {
  const { orders, page, hasPrev, hasNext, total, next, prev } = useOpenOrders(account, { pageSize: 10 });
  const triggers = useTriggers(account);
  return (
    <div>
      <OrderRows orders={orders} triggers={page === 0 ? triggers : undefined} empty="no open orders" />
      {total > 0 && <Pager page={page} hasPrev={hasPrev} hasNext={hasNext} prev={prev} next={next} note={`${total} open`} />}
    </div>
  );
}

// Order history: ALL orders (unfiltered), cursor-paginated over REST.
function OrderHistoryView({ account }: { account: Address }) {
  const { orders, page, hasPrev, hasNext, loading, next, prev } = useOrdersPage(account, { limit: 10 });
  return (
    <div>
      <OrderRows orders={orders} empty={loading ? "loading…" : "no order history"} />
      <Pager page={page} hasPrev={hasPrev} hasNext={hasNext} prev={prev} next={next} note={loading ? "loading…" : undefined} />
    </div>
  );
}

function BottomTabs({ account }: { account: Address }) {
  const [activeTab, setActiveTab] = useState<"positions" | "open" | "history">("positions");
  const tabs = [["positions", "Positions"], ["open", "Open Orders"], ["history", "Order History"]] as const;
  return (
    <div className="panel">
      <div className="tabs">
        {tabs.map(([k, label]) => (
          <button key={k} className={`tab${activeTab === k ? " is-active" : ""}`} onClick={() => setActiveTab(k)}>{label}</button>
        ))}
      </div>
      <div style={{ display: activeTab === "positions" ? "block" : "none" }}><PositionsTable account={account} /></div>
      <div style={{ display: activeTab === "open" ? "block" : "none" }}><OpenOrders account={account} /></div>
      <div style={{ display: activeTab === "history" ? "block" : "none" }}><OrderHistoryView account={account} /></div>
    </div>
  );
}
