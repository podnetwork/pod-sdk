import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  createChart, CandlestickSeries,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from "lightweight-charts";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  accountMetrics, formatAmount, formatPrice, parseAmount, previewOrder, toNumber,
  type Address, type Bar, type MarketId, type Order, type Resolution,
} from "@pod-network/trade-sdk";
import {
  useMarkets, useMarket, useCandles, useOrderbook, useOpenOrders, useOrdersPage, useLivePositions,
} from "@pod-network/trade-sdk/react";
import { buildSubmitOrder, buildCancelOrder, sendRawTransaction } from "@pod-network/trade-sdk/write";

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
// high-level send would drop.
async function submit(tx: { to: Address; data: `0x${string}`; value: bigint; type: "eip1559"; gas: bigint; maxPriorityFeePerGas: bigint }): Promise<string> {
  const maxFeePerGas = await publicClient.getGasPrice();
  const prepared = await wallet.prepareTransactionRequest({ ...tx, account, chain: podDevnet, maxFeePerGas });
  const serialized = await wallet.signTransaction(prepared as never);
  return sendRawTransaction(RPC_URL, serialized);
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
async function notify(msg: string, run: () => Promise<string>) {
  const id = ++toastSeq;
  setToast({ id, msg, kind: "pending" });
  try { const h = await run(); setToast({ id, msg: `sent ${h.slice(0, 10)}…`, kind: "ok" }); }
  catch (e) { setToast({ id, msg: (e as { shortMessage?: string }).shortMessage ?? (e as Error).message, kind: "err" }); }
}
function Toaster() {
  const items = useSyncExternalStore((f) => { toastSubs.add(f); return () => { toastSubs.delete(f); }; }, () => toasts);
  const color = (k: Toast["kind"]) => (k === "pending" ? "#2c5cff" : k === "ok" ? "#3fb273" : "#e5575b");
  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 8, maxWidth: 340 }}>
      {items.map((t) => (
        <div key={t.id} style={{ background: "#1d2027", borderLeft: `3px solid ${color(t.kind)}`, border: `1px solid ${color(t.kind)}`, borderRadius: 6, padding: "8px 12px", color: "#e6e8ec", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", wordBreak: "break-word" }}>
          {t.kind === "pending" ? "⏳ " : t.kind === "ok" ? "✓ " : "✕ "}{t.msg}
        </div>
      ))}
    </div>
  );
}
const demoAddress = account.address;

const box: React.CSSProperties = {
  border: "1px solid #23262e", borderRadius: 6, padding: 10, background: "#14161b",
};
// Amounts/USD/sizes: fixed decimals (no trailing-zero trimming → stable columns).
const fmt = (v: bigint | undefined, p = 2) => (v === undefined ? "—" : formatAmount(v, 18, p, { trim: false }));
// Prices: decimals derived from the market tick (fallback 0.01 → 2dp).
const DEFAULT_TICK = 10_000_000_000_000_000n;
const px = (v: bigint | undefined, tick?: bigint) => (v === undefined ? "—" : formatPrice(v, tick ?? DEFAULT_TICK));

// The demo's embedded wallet address — fixed (not user-chosen).
const ACCOUNT = demoAddress as Address;

const inputStyle: React.CSSProperties = {
  background: "#14161b", color: "#d7dae0", border: "1px solid #23262e", borderRadius: 6, padding: "6px 8px",
};
const tab = (active: boolean, color = "#2c5cff"): React.CSSProperties => ({
  flex: 1, background: active ? color : "#1d2027", color: active ? "#fff" : "#9aa0ab",
  border: "1px solid #23262e", borderRadius: 4, padding: "5px 8px", cursor: "pointer",
});
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
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, display: "grid", gap: 12 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15 }}>pod trade SDK</strong>
        <select value={selected} onChange={(e) => setId(e.target.value as MarketId)} style={inputStyle}>
          {!markets && <option>loading markets…</option>}
          {markets?.map((m) => <option key={m.id} value={m.id}>{marketLabel(m)}</option>)}
        </select>
        <span style={{ marginLeft: "auto", color: "#7c828d", fontSize: 11 }}>demo wallet</span>
        <code style={{ color: "#9aa0ab", fontVariantNumeric: "tabular-nums" }}>{ACCOUNT}</code>
      </header>

      <AccountSummary account={ACCOUNT} />
      {selected && <Stats id={selected as MarketId} />}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 240px 260px", gap: 12, alignItems: "stretch" }}>
        {selected && <Chart id={selected as MarketId} />}
        {selected && <OrderbookView id={selected as MarketId} />}
        {selected && <TradingPanel id={selected as MarketId} account={ACCOUNT} />}
      </div>

      <BottomTabs account={ACCOUNT} />
      <Toaster />
    </div>
  );
}

const signed = (v: bigint | undefined, p = 2) =>
  v === undefined ? "—" : (v < 0n ? "-" : "") + formatAmount(v < 0n ? -v : v, 18, p, { trim: false });
const pnlColor = (v?: bigint) => (v === undefined ? "#9aa0ab" : v < 0n ? "#e5575b" : "#3fb273");

interface Card { label: string; value: string; sub?: string; color?: string }

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
    { label: "total P&L", value: signed(m?.totalPnl), sub: pctStr(m?.totalPnlPct), color: pnlColor(m?.totalPnl) },
    { label: "unrealized P&L", value: signed(snap?.totalUnrealizedPnl), sub: pctStr(m?.unrealizedPnlPct), color: pnlColor(snap?.totalUnrealizedPnl) },
    { label: "realized P&L", value: signed(snap?.totalRealizedPnl), color: pnlColor(snap?.totalRealizedPnl) },
  ];
  return (
    <div style={{ ...box, display: "flex", flexWrap: "wrap", gap: 18 }}>
      {cards.map((c) => (
        <div key={c.label}>
          <div style={{ color: "#7c828d", fontSize: 11 }}>{c.label}</div>
          <div style={{ fontVariantNumeric: "tabular-nums", color: c.color ?? "#d7dae0" }}>{c.value}</div>
          {c.sub && <div style={{ fontVariantNumeric: "tabular-nums", color: c.color ?? "#7c828d", fontSize: 11 }}>{c.sub}</div>}
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
  if (!snap) return <div style={{ color: "#7c828d" }}>…</div>;
  if (snap.positions.length === 0) return <div style={{ color: "#7c828d" }}>no open positions</div>;
  return (
    // table-layout: fixed → columns keep their width when numbers change size (no jitter)
    <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
      <thead style={{ color: "#7c828d", textAlign: "left" }}>
        <tr>
          <th>market</th><th>kind</th><th>size</th><th>entry</th><th>mark</th><th>notional</th>
          <th>margin</th><th>liq</th><th>funding</th><th>uPnL</th><th>rPnL</th>
        </tr>
      </thead>
      <tbody>
        {snap.positions.map((p, i) => {
          const t = marketOf(p.orderbookId)?.tickPrecision;
          return (
          <tr key={i} style={{ borderTop: "1px solid #1d2027" }}>
            <td>{nameOf(p.orderbookId)}</td>
            <td>{p.kind}{p.kind === "perp" ? ` ${p.side} ${p.leverage.toFixed(1)}x` : ""}</td>
            <td>{signed(p.kind === "perp" ? p.size : p.balance)}</td>
            <td>{p.kind === "perp" ? px(p.entryPrice, t) : fmt(p.costBasis)}</td>
            <td>{px(p.markPrice, t)}</td>
            <td>{p.kind === "perp" ? fmt(p.notional) : "—"}</td>
            <td>{p.kind === "perp" ? fmt(p.margin) : "—"}</td>
            <td>{p.kind === "perp" ? px(p.liquidationPrice, t) : "—"}</td>
            <td style={{ color: p.kind === "perp" ? pnlColor(p.fundingAccrued) : "#9aa0ab" }}>
              {p.kind === "perp" ? signed(p.fundingAccrued, 4) : "—"}
            </td>
            <td style={{ color: pnlColor(p.unrealizedPnl) }}>{signed(p.unrealizedPnl)}</td>
            <td style={{ color: pnlColor(p.realizedPnl) }}>{signed(p.realizedPnl)}</td>
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
    <div style={{ ...box, display: "flex", flexWrap: "wrap", gap: 18 }}>
      {cells.map(([k, v]) => (
        <div key={k}>
          <div style={{ color: "#7c828d", fontSize: 11 }}>{k}</div>
          <div style={{ fontVariantNumeric: "tabular-nums" }}>{v}</div>
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
    <div style={{ ...box, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {RESOLUTIONS.map((r) => (
          <button
            key={r}
            onClick={() => setRes(r)}
            style={{
              background: r === res ? "#2c5cff" : "#1d2027",
              color: r === res ? "#fff" : "#9aa0ab",
              border: "1px solid #23262e", borderRadius: 4, padding: "3px 8px", cursor: "pointer",
            }}
          >
            {r}
          </button>
        ))}
      </div>
      <div ref={elRef} style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}

const OB_ROWS = 10; // levels shown per side — fixed, so the panel height never changes
const OB_ROW_H = 18;

type Lvl = { price: bigint; volume: bigint; total: bigint } | undefined;
const obCols: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", fontVariantNumeric: "tabular-nums" };

function OrderbookView({ id }: { id: MarketId }) {
  const ob = useOrderbook(id, { depth: OB_ROWS });
  const t = useMarket(id)?.tickPrecision;
  const row = (l: Lvl, color: string, key: string) => (
    <div key={key} style={{ ...obCols, height: OB_ROW_H, lineHeight: `${OB_ROW_H}px` }}>
      {l ? (
        <>
          <span style={{ color }}>{px(l.price, t)}</span>
          <span style={{ textAlign: "right", color: "#9aa0ab" }}>{fmt(l.volume, 2)}</span>
          <span style={{ textAlign: "right", color: "#6b7280" }}>{fmt(l.total, 2)}</span>
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
    <div style={box}>
      <div style={{ ...obCols, color: "#7c828d", fontSize: 11, marginBottom: 4 }}>
        <span>price</span><span style={{ textAlign: "right" }}>size</span><span style={{ textAlign: "right" }}>total</span>
      </div>
      {askSlots.map((l, i) => row(l, "#e5575b", `a${i}`))}
      <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #23262e", borderBottom: "1px solid #23262e", margin: "4px 0", padding: "3px 0", fontSize: 11, color: "#9aa0ab", fontVariantNumeric: "tabular-nums" }}>
        <span>mid {ob?.mid !== undefined ? px(ob.mid, t) : "—"}</span>
        <span style={{ color: "#7c828d" }}>
          spread {ob?.spread !== undefined ? px(ob.spread, t) : "—"}{ob?.spreadPct !== undefined ? ` (${ob.spreadPct.toFixed(3)}%)` : ""}
        </span>
      </div>
      {bidSlots.map((l, i) => row(l, "#3fb273", `b${i}`))}
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

  if (!market || !snap) return <div style={box}>trade — loading market & account…</div>;

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
    notify(`${side === "long" ? "Buy" : "Sell"} ${market.name} ($${effUsd.toFixed(0)})`, () => submit(tx));
  };

  return (
    <div style={box}>
      <div style={{ color: "#7c828d", fontSize: 11, marginBottom: 8 }}>trade {market.name}</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <button style={tab(side === "long", "#3fb273")} onClick={() => setSide("long")}>long</button>
        <button style={tab(side === "short", "#e5575b")} onClick={() => setSide("short")}>short</button>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        <button style={tab(type === "market")} onClick={() => setType("market")}>market</button>
        <button style={tab(type === "limit")} onClick={() => setType("limit")}>limit</button>
      </div>
      {type === "limit" && (
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          <input
            placeholder="limit price"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value.trim())}
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
          />
          <button
            disabled={mid === undefined}
            onClick={() => mid !== undefined && setLimitPrice(formatPrice(mid, market.tickPrecision))}
            style={tab(false)}
            title="set to mid price"
          >
            mid
          </button>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#7c828d" }}>
        <span>notional</span>
        <span>
          ${effUsd.toFixed(0)} / ${maxUsd.toFixed(0)}{" "}
          <button
            onClick={() => setNotionalUsd(maxUsd)}
            style={{ background: "transparent", border: "none", color: "#2c5cff", cursor: "pointer", fontSize: 11, padding: 0 }}
            title="set to max"
          >
            max
          </button>
        </span>
      </div>
      <input
        type="range" min={0} max={Math.max(1, Math.floor(maxUsd))} step={Math.max(1, maxUsd / 200)}
        value={effUsd}
        onChange={(e) => setNotionalUsd(Number(e.target.value))}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: "#7c828d" }}>{k}</span><span>{v}</span>
          </div>
        ))}
      </div>
      <button
        disabled={disabled}
        onClick={send}
        style={{
          width: "100%", padding: 8, borderRadius: 6, border: "none",
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
          background: side === "long" ? "#3fb273" : "#e5575b", color: "#fff",
        }}
      >
        {side === "long" ? "Buy / Long" : "Sell / Short"} ({type})
      </button>
      {!preview.sufficientMargin && effUsd > 0 && (
        <div style={{ color: "#e5575b", fontSize: 11, marginTop: 4 }}>insufficient margin</div>
      )}
    </div>
  );
}

function OrderRows({ orders, empty }: { orders: Order[]; empty: string }) {
  const markets = useMarkets();
  const [busy, setBusy] = useState<string | null>(null);
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
    // order history is a REST snapshot that won't refresh on its own, so the
    // toast is the only visible signal that a cancel landed.
    await notify(`Cancel ${m.name} order`, () => submit(buildCancelOrder(m.id, o.id, { auctionIntervalUs: m.auctionIntervalMs * 1000 })));
    setBusy(null);
  };
  if (!orders.length) return <div style={{ color: "#7c828d" }}>{empty}</div>;
  return (
    <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
      <thead style={{ color: "#7c828d", textAlign: "left" }}>
        <tr><th>market</th><th>side</th><th>type</th><th>price</th><th>size</th><th>filled</th><th>status</th><th></th></tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id} style={{ borderTop: "1px solid #1d2027" }}>
            <td>{assetOf(o)}</td>
            <td style={{ color: o.side === "buy" ? "#3fb273" : "#e5575b" }}>{o.side}</td>
            <td>{o.orderType}</td>
            <td>{px(o.price, marketOf(o)?.tickPrecision)}</td>
            <td>{fmt(o.initialSize < 0n ? -o.initialSize : o.initialSize, 2)}</td>
            <td>{fmt(o.filledBase, 2)}</td>
            <td>{o.status}</td>
            <td style={{ textAlign: "right" }}>
              {o.status === "active" && (
                <button
                  disabled={busy === o.id}
                  onClick={() => cancel(o)}
                  style={{ background: "transparent", color: "#e5575b", border: "1px solid #3a2326", borderRadius: 4, padding: "1px 6px", cursor: busy === o.id ? "wait" : "pointer", fontSize: 11 }}
                >
                  cancel
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Pager({ page, hasPrev, hasNext, prev, next, note }: {
  page: number; hasPrev: boolean; hasNext: boolean; prev: () => void; next: () => void; note?: string;
}) {
  const btn = (on: boolean): React.CSSProperties => ({
    background: "#1d2027", color: on ? "#d7dae0" : "#4a4f59",
    border: "1px solid #23262e", borderRadius: 4, padding: "3px 10px", cursor: on ? "pointer" : "not-allowed",
  });
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, color: "#7c828d", fontSize: 12 }}>
      <button style={btn(hasPrev)} disabled={!hasPrev} onClick={prev}>‹ prev</button>
      <span>page {page + 1}{note ? ` · ${note}` : ""}</span>
      <button style={btn(hasNext)} disabled={!hasNext} onClick={next}>next ›</button>
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
    <div style={box}>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {tabs.map(([k, label]) => (
          <button key={k} style={tab(activeTab === k)} onClick={() => setActiveTab(k)}>{label}</button>
        ))}
      </div>
      <div style={{ display: activeTab === "positions" ? "block" : "none" }}><PositionsTable account={account} /></div>
      <div style={{ display: activeTab === "open" ? "block" : "none" }}><OpenOrders account={account} /></div>
      <div style={{ display: activeTab === "history" ? "block" : "none" }}><OrderHistoryView account={account} /></div>
    </div>
  );
}
