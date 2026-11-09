import { expect, it, onTestFinished } from "vitest";

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

it("tags bigints even when a page script has patched BigInt.prototype.toJSON", () => {
  const proto = BigInt.prototype as { toJSON?: () => string };
  proto.toJSON = function (this: bigint) { return `${this.toString()}n`; };
  onTestFinished(() => { delete proto.toJSON; });
  const value = { cash: 5n, book: [-7n], name: "A/Q" };
  expect(parseBig(stringifyBig(value))).toEqual(value);
  expect(parseBig(stringifyBig(3n))).toBe(3n);
});
