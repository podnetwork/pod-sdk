import { describe, expect, it } from "vitest";

import { parseAmount, WAD } from "./units.js";

describe("parseAmount", () => {
  it("parses decimal amounts without a leading zero", () => {
    expect(parseAmount(".5")).toBe(WAD / 2n);
    expect(parseAmount("-.5")).toBe(-(WAD / 2n));
  });

  it("keeps invalid empty decimal inputs invalid", () => {
    expect(() => parseAmount(".")).toThrow();
    expect(() => parseAmount("-.")).toThrow();
    expect(() => parseAmount("")).toThrow();
    expect(() => parseAmount("-")).toThrow();
  });
});
