import type { Resolution } from "../types/public.js";

/** Bucket width per resolution, in seconds. 1M is calendar-variable; see pages. */
export const RESOLUTION_SECONDS: Record<Resolution, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1_800,
  "1h": 3_600,
  "4h": 14_400,
  "1d": 86_400,
  "1W": 604_800,
  "1M": 2_592_000, // nominal 30d; only used as a hint, pages use calendar months
};

/**
 * Canonical page size K (number of buckets per cached page), chosen as the
 * largest value <= 500 (the server's hard cap) for the resolution. Pages are
 * epoch-anchored (pageIndex = floor(bucketIndex / K)) so every client computes
 * identical, settled-aligned page boundaries -> high cache-hit rate + the
 * server flags fully-past pages `immutable`.
 */
export const RESOLUTION_PAGE_BUCKETS: Record<Resolution, number> = {
  "1m": 360, // 6h
  "5m": 288, // 1 day
  "15m": 96, // 1 day
  "30m": 336, // 1 week
  "1h": 168, // 1 week
  "4h": 180, // ~30 days
  "1d": 365, // ~1 year
  "1W": 260, // ~5 years
  "1M": 120, // ~decade (calendar-month buckets)
};

export const RESOLUTIONS = Object.keys(RESOLUTION_SECONDS) as Resolution[];

export function isResolution(x: string): x is Resolution {
  return x in RESOLUTION_SECONDS;
}
