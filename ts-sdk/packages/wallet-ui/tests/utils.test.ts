import { describe, it, expect } from "vitest";
import { truncateAddress, cn } from "../src/utils.js";

describe("truncateAddress", () => {
  it("truncates a standard Ethereum address", () => {
    const address = "0x1234567890123456789012345678901234567890";
    expect(truncateAddress(address)).toBe("0x1234...7890");
  });

  it("truncates with custom char count", () => {
    const address = "0x1234567890123456789012345678901234567890";
    expect(truncateAddress(address, 6)).toBe("0x123456...567890");
  });

  it("returns empty string for empty input", () => {
    expect(truncateAddress("")).toBe("");
  });

  it("returns short addresses unchanged", () => {
    expect(truncateAddress("0x1234")).toBe("0x1234");
  });
});

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("dedupes Tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
