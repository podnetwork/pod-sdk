import { expect, it } from "vitest";

import { parseBig, stringifyBig } from "./json.js";

it("round-trips bigints, including nested and negative ones", () => {
  const value = { fee: 25n, book: [{ px: -3n, sz: 10n ** 30n }], name: "A/Q" };
  expect(parseBig(stringifyBig(value))).toEqual(value);
});

it("never reads a string back as a bigint", () => {
  // Market names, symbols and rejection reasons are free text.
  const value = { name: "123n", symbol: "-7n", reason: "0n" };
  const back = parseBig<typeof value>(stringifyBig(value));
  expect(back).toEqual(value);
  expect(typeof back.name).toBe("string");
});
