// Every branch of the ported classifier, in the Rust's own order. This is the whole
// safety net for the port: the same order's direction comes from the server over REST
// and from this function over the stream, so a branch that disagrees shows one label
// on a live row and a different one after a refetch.

import { describe, expect, it } from "vitest";

import { classifyPerpDirection } from "./direction.js";

const L = (n: number) => BigInt(n); // long: positive
const S = (n: number) => BigInt(-n); // short: negative

describe("classifyPerpDirection", () => {
  it("opens from flat", () => {
    expect(classifyPerpDirection(0n, L(5))).toBe("open_long");
    expect(classifyPerpDirection(0n, S(5))).toBe("open_short");
  });

  it("distinguishes opening from increasing — the whole point of sending the position", () => {
    // Opening is covered above; these are the same side and size from a position that
    // already exists, which is the only thing that distinguishes them.
    expect(classifyPerpDirection(L(3), L(8))).toBe("add_long");
    expect(classifyPerpDirection(S(3), S(8))).toBe("add_short");
  });

  it("reduces without closing", () => {
    expect(classifyPerpDirection(L(10), L(4))).toBe("reduce_long");
    expect(classifyPerpDirection(S(10), S(4))).toBe("reduce_short");
  });

  it("closes to flat", () => {
    expect(classifyPerpDirection(L(10), 0n)).toBe("close_long");
    expect(classifyPerpDirection(S(10), 0n)).toBe("close_short");
  });

  it("flips through zero", () => {
    expect(classifyPerpDirection(L(4), S(2))).toBe("long_to_short");
    expect(classifyPerpDirection(S(4), L(2))).toBe("short_to_long");
  });

  it("reports an unchanged position as a reduce, per the Rust", () => {
    // Reachable when a fill nets to nothing. Odd, but matching the server matters
    // more than picking a nicer answer here.
    expect(classifyPerpDirection(0n, 0n)).toBe("reduce_long");
    expect(classifyPerpDirection(L(5), L(5))).toBe("reduce_long");
    expect(classifyPerpDirection(S(5), S(5))).toBe("reduce_short");
  });
});
