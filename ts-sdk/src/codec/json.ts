// JSON that survives the SDK's bigints, for host-side persistence (the markets
// cache, last-known snapshots). A bigint is written as `{"$bigint":"<digits>"}`
// rather than a suffixed string, so no string value (a market name, a rejection
// reason) can ever read back as a bigint. No SDK type has a `$bigint` field.

const TAG = "$bigint";

export const stringifyBig = (value: unknown): string =>
  JSON.stringify(value, (_k, v: unknown) => (typeof v === "bigint" ? { [TAG]: v.toString() } : v));

const isTagged = (v: unknown): v is { [TAG]: string } => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const keys = Object.keys(v);
  return keys.length === 1 && keys[0] === TAG && typeof (v as Record<string, unknown>)[TAG] === "string";
};

export const parseBig = <T>(raw: string): T =>
  JSON.parse(raw, (_k, v: unknown) => (isTagged(v) ? BigInt(v[TAG]) : v)) as T;
