// Minimal TradingView Charting Library datafeed (IDatafeedChartApi-shaped),
// backed by the SDK's CandleSeries. Typed loosely so the SDK takes no
// dependency on the (private) charting library types.

import type { PodTradeClient } from "../client.js";
import type { Bar, MarketId, Resolution } from "../types/public.js";
import { toNumber } from "../codec/units.js";

const TV_TO_RESOLUTION: Record<string, Resolution> = {
  "1": "1m", "5": "5m", "15": "15m", "30": "30m",
  "60": "1h", "240": "4h", "1D": "1d", "1W": "1W", "1M": "1M",
};

interface TvBar { time: number; open: number; high: number; low: number; close: number; volume: number }

function toTvBar(b: Bar, quoteDecimals = 18): TvBar {
  return {
    time: b.time,
    open: toNumber(b.open, quoteDecimals),
    high: toNumber(b.high, quoteDecimals),
    low: toNumber(b.low, quoteDecimals),
    close: toNumber(b.close, quoteDecimals),
    volume: toNumber(b.volume),
  };
}

/** Returns an object implementing the TradingView IDatafeedChartApi surface. */
export function createPodDatafeed(client: PodTradeClient): unknown {
  const subs = new Map<string, () => void>();

  return {
    onReady(cb: (config: unknown) => void) {
      setTimeout(() => cb({
        supported_resolutions: Object.keys(TV_TO_RESOLUTION),
        supports_time: true,
      }), 0);
    },

    resolveSymbol(symbolName: string, onResolve: (info: unknown) => void) {
      setTimeout(() => onResolve({
        name: symbolName, ticker: symbolName, description: symbolName,
        type: "crypto", session: "24x7", timezone: "Etc/UTC",
        minmov: 1, pricescale: 100_000_000, has_intraday: true,
        supported_resolutions: Object.keys(TV_TO_RESOLUTION),
        volume_precision: 2, data_status: "streaming",
      }), 0);
    },

    async getBars(
      symbolInfo: { ticker?: string; name: string },
      resolution: string,
      periodParams: { from: number; to: number; firstDataRequest: boolean },
      onResult: (bars: TvBar[], meta: { noData: boolean }) => void,
      onError: (reason: string) => void,
    ) {
      try {
        const id = (symbolInfo.ticker ?? symbolInfo.name) as MarketId;
        const res = TV_TO_RESOLUTION[resolution] ?? "1h";
        const series = client.candles(id, res, {
          from: periodParams.from * 1000,
          to: periodParams.to * 1000,
        });
        const bars = await series.ready();
        const inRange = bars
          .filter((b) => b.time >= periodParams.from * 1000 && b.time < periodParams.to * 1000)
          .map((b) => toTvBar(b));
        onResult(inRange, { noData: inRange.length === 0 });
      } catch (e) {
        onError(String(e));
      }
    },

    subscribeBars(
      symbolInfo: { ticker?: string; name: string },
      resolution: string,
      onTick: (bar: TvBar) => void,
      listenerGuid: string,
    ) {
      const id = (symbolInfo.ticker ?? symbolInfo.name) as MarketId;
      const res = TV_TO_RESOLUTION[resolution] ?? "1h";
      const series = client.candles(id, res);
      const unsub = series.subscribe(() => {
        const bars = series.get();
        if (bars && bars.length) onTick(toTvBar(bars[bars.length - 1]!));
      });
      subs.set(listenerGuid, unsub);
    },

    unsubscribeBars(listenerGuid: string) {
      subs.get(listenerGuid)?.();
      subs.delete(listenerGuid);
    },
  };
}
