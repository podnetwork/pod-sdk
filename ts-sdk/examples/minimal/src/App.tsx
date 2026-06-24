import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  createChart, CandlestickSeries,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from "lightweight-charts";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  accountMetrics, formatAmount, formatPrice, parseAmount, previewOrder, toNumber,
  type Address, type Bar, type Hash, type MarketId, type Order, type Resolution,
} from "@pod-network/trade-sdk";
import {
  useMarkets, useMarket, useCandles, useOrderbook, useOpenOrders, useOrdersPage, useLivePositions,
} from "@pod-network/trade-sdk/react";
import {
  buildSubmitOrder, buildCancelOrder, buildUpdateOrder, sendRawTransaction, waitForReceipt, type PodTxRequest,
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

// Amounts/USD/sizes: fixed decimals (no trailing-zero trimming → stable columns).
const fmt = (v: bigint | undefined, p = 2) => (v === undefined ? "—" : formatAmount(v, 18, p, { trim: false }));
// Prices: decimals derived from the market tick (fallback 0.01 → 2dp).
const DEFAULT_TICK = 10_000_000_000_000_000n;
const px = (v: bigint | undefined, tick?: bigint) => (v === undefined ? "—" : formatPrice(v, tick ?? DEFAULT_TICK));
// Signed amount + the up/down/flat class that colors it.
const signed = (v: bigint | undefined, p = 2) =>
  v === undefined ? "—" : (v < 0n ? "-" : "") + formatAmount(v < 0n ? -v : v, 18, p, { trim: false });
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
    markets?.find((m) => m.type === "perpetual")?.id
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
    { label: "account value", value: fmt(snap?.accountValue, 2) },
    { label: "perps equity", value: fmt(snap?.perpsEquity, 2), sub: m && `eff. lev ${m.effectiveLeverage.toFixed(2)}x` },
    { label: "cash", value: fmt(snap?.cash, 2) },
    { label: "withdrawable", value: fmt(snap?.withdrawableCash, 2) },
    { label: "total P&L", value: signed(m?.totalPnl), sub: pctStr(m?.totalPnlPct), cls: pnlCls(m?.totalPnl) },
    { label: "unrealized P&L", value: signed(snap?.totalUnrealizedPnl), sub: pctStr(m?.unrealizedPnlPct), cls: pnlCls(snap?.totalUnrealizedPnl) },
    { label: "realized P&L", value: signed(snap?.totalRealizedPnl), cls: pnlCls(snap?.totalRealizedPnl) },
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
              <td>{p.kind === "perp" ? px(p.entryPrice, t) : fmt(p.costBasis)}</td>
              <td>{px(p.markPrice, t)}</td>
              <td>{p.kind === "perp" ? fmt(p.notional) : "—"}</td>
              <td>{p.kind === "perp" ? fmt(p.margin) : "—"}</td>
              <td>{p.kind === "perp" ? px(p.liquidationPrice, t) : "—"}</td>
              <td className={p.kind === "perp" ? pnlCls(p.fundingAccrued) : "flat"}>
                {p.kind === "perp" ? signed(p.fundingAccrued, 4) : "—"}
              </td>
              <td className={pnlCls(p.unrealizedPnl)}>{signed(p.unrealizedPnl)}</td>
              <td className={pnlCls(p.realizedPnl)}>{signed(p.realizedPnl)}</td>
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
    ["24h vol", fmt(m?.volume24h)],
    ["24h high", px(m?.high24h, t)],
    ["24h low", px(m?.low24h, t)],
    ["24h chg", change === undefined ? "—" : `${(change / 100).toFixed(2)}%`],
    ["funding", m?.fundingRate === undefined ? "—" : `${(toNumber(m.fundingRate) * 100).toFixed(4)}%`],
    ["open int.", fmt(m?.openInterest)],
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
          <span className={side === "ask" ? "ob-ask" : "ob-bid"}>{px(l.price, t)}</span>
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
        <span>mid {ob?.mid !== undefined ? px(ob.mid, t) : "—"}</span>
        <span className="muted">
          spread {ob?.spread !== undefined ? px(ob.spread, t) : "—"}{ob?.spreadPct !== undefined ? ` (${ob.spreadPct.toFixed(3)}%)` : ""}
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
  const [notionalUsd, setNotionalUsd] = useState(0);

  if (!market || !snap) return <div className="panel">trade — loading market & account…</div>;

  const mid = ob?.mid;
  // Limit uses the typed price; market uses mid (falls back to mark/clearing).
  const ref = mid ?? market.markPrice ?? market.lastClearingPrice ?? 0n;
  const price = type === "limit" && limitPrice ? parseAmount(limitPrice) : ref;

  // All numbers come from the SDK. maxNotional is independent of the chosen
  // notional, so derive it from a zero-notional preview, then clamp.
  const maxUsd = toNumber(previewOrder(snap, market, { side, price, notional: 0n }).maxNotional);
  const effUsd = Math.min(notionalUsd, maxUsd);
  const preview = previewOrder(snap, market, { side, price, notional: parseAmount(effUsd.toFixed(2)) });

  const rows: [string, string][] = [
    ["available margin", fmt(preview.availableMargin, 2)],
    ["margin required", fmt(preview.marginRequired, 2)],
    ["implied leverage (cross)", `${preview.impliedLeverage.toFixed(2)}x`],
    ["order size", fmt(preview.size < 0n ? -preview.size : preview.size, 4)],
  ];
  const disabled = !preview.sufficientMargin || effUsd <= 0 || price <= 0n;

  // Build the unsigned tx with the SDK, then sign + send with the demo wallet.
  // The order then shows up live in the order book + history via the read SDK.
  const send = () => {
    const tx = buildSubmitOrder({
      orderbookId: id,
      side: side === "long" ? "buy" : "sell",
      orderType: type,
      price,
      tickPrecision: market.tickPrecision,
      auctionIntervalUs: market.auctionIntervalMs * 1000,
      size: preview.size < 0n ? -preview.size : preview.size,
    });
    notify(`${side === "long" ? "Buy" : "Sell"} ${market.name} ($${effUsd.toFixed(0)})`, (u) => submitConfirm(tx, u));
  };

  return (
    <div className="panel">
      <div className="tp__label">trade {market.name}</div>
      <div className="tp__sides">
        <button className={`tab tab--long${side === "long" ? " is-active" : ""}`} onClick={() => setSide("long")}>long</button>
        <button className={`tab tab--short${side === "short" ? " is-active" : ""}`} onClick={() => setSide("short")}>short</button>
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
        <span>notional</span>
        <span>
          ${effUsd.toFixed(0)} / ${maxUsd.toFixed(0)}{" "}
          <button className="link-btn" onClick={() => setNotionalUsd(maxUsd)} title="set to max">max</button>
        </span>
      </div>
      <input
        className="tp__slider"
        type="range" min={0} max={Math.max(1, Math.floor(maxUsd))} step={Math.max(1, maxUsd / 200)}
        value={effUsd}
        onChange={(e) => setNotionalUsd(Number(e.target.value))}
      />
      <div className="tp__rows">
        {rows.map(([k, v]) => (
          <div key={k}><span className="muted">{k}</span><span>{v}</span></div>
        ))}
      </div>
      <button className={`submit-btn submit-btn--${side}`} disabled={disabled} onClick={send}>
        {side === "long" ? "Buy / Long" : "Sell / Short"} ({type})
      </button>
      {!preview.sufficientMargin && effUsd > 0 && <div className="tp__warn">insufficient margin</div>}
    </div>
  );
}

function OrderRows({ orders, empty }: { orders: Order[]; empty: string }) {
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
  if (!orders.length) return <div className="empty">{empty}</div>;
  return (
    <table className="tbl">
      <thead>
        <tr><th>market</th><th>side</th><th>type</th><th>price</th><th>size</th><th>filled</th><th>status</th><th></th></tr>
      </thead>
      <tbody>
        {orders.map((o) => {
          const isEditing = editing === o.id;
          const tick = marketOf(o)?.tickPrecision;
          return (
            <tr key={o.id}>
              <td>{assetOf(o)}</td>
              <td className={o.side === "buy" ? "up" : "down"}>{o.side}</td>
              <td>{o.orderType}</td>
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

// Open orders: active only + pagination, both provided by the library.
function OpenOrders({ account }: { account: Address }) {
  const { orders, page, hasPrev, hasNext, total, next, prev } = useOpenOrders(account, { pageSize: 10 });
  return (
    <div>
      <OrderRows orders={orders} empty="no open orders" />
      {total > 0 && <Pager page={page} hasPrev={hasPrev} hasNext={hasNext} prev={prev} next={next} note={`${total} open`} />}
    </div>
  );
}

// Order history: ALL orders (unfiltered), cursor-paginated over REST.
function OrderHistoryView({ account }: { account: Address }) {
  const { orders, page, hasPrev, hasNext, loading, next, prev } = useOrdersPage(account, { limit: 25 });
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
