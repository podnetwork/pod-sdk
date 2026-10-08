// JSON that survives the SDK's bigints, for host-side persistence (the markets
// cache, last-known snapshots). bigints round-trip as "<digits>n" strings.

export const stringifyBig = (value: unknown): string =>
  JSON.stringify(value, (_k, v: unknown) => (typeof v === "bigint" ? `${v}n` : v));

export const parseBig = <T>(raw: string): T =>
  JSON.parse(raw, (_k, v: unknown) =>
    typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v) as T;
