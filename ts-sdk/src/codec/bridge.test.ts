import { describe, expect, it } from "vitest";
import {
  bridgeTokenFor, checkWithdrawAmount, maxWithdrawable,
  quantizeWithdrawAmount, toClaimAmount, toPodAmount, withdrawStep,
} from "./bridge.js";
import type { Address, BridgeToken } from "../types/public.js";

const POD_USDC = "0x1111111111111111111111111111111111111111" as Address;
const L1_USDC = "0x2222222222222222222222222222222222222222" as Address;
const UNBRIDGED = "0x9999999999999999999999999999999999999999" as Address;

const E18 = 1_000_000_000_000_000_000n;

/** 6-decimal token, min 1 USDC, max 1000 USDC — the devnet native-USD mapping. */
const usdc: BridgeToken = {
  podToken: POD_USDC,
  l1Token: L1_USDC,
  decimals: 6,
  min: 1_000_000n,
  max: 1_000_000_000n,
};

const eighteen: BridgeToken = { ...usdc, decimals: 18, min: 1n, max: 2n ** 255n };

describe("decimal conversion", () => {
  it("scales an 18-decimal amount down to the claim chain's decimals", () => {
    expect(toClaimAmount(E18, 6)).toBe(1_000_000n);
  });

  it("round-trips back to 18 decimals", () => {
    expect(toPodAmount(toClaimAmount(E18, 6), 6)).toBe(E18);
  });

  it("is the identity for an 18-decimal token", () => {
    expect(toClaimAmount(7n, 18)).toBe(7n);
    expect(toPodAmount(7n, 18)).toBe(7n);
  });

  // The node multiplies up rather than erroring (WithdrawRules Ordering::Greater),
  // so a token finer than pod's 18 is always exactly representable.
  it("scales up for a token with more decimals than pod", () => {
    expect(toClaimAmount(3n, 20)).toBe(300n);
    expect(toPodAmount(300n, 20)).toBe(3n);
  });

  // Truncating here is what produces dust. The node rejects the amount at
  // admission instead, so this must refuse rather than silently floor —
  // quantizeWithdrawAmount is the explicit way to round down.
  it("refuses an amount that is not a whole number of claim-chain units", () => {
    expect(() => toClaimAmount(E18 + 1n, 6)).toThrow(/not exactly representable/);
  });
});

describe("quantization", () => {
  it("reports the step an amount must be a multiple of", () => {
    expect(withdrawStep(6)).toBe(1_000_000_000_000n); // 1e12
    expect(withdrawStep(18)).toBe(1n);
    expect(withdrawStep(20)).toBe(1n);
  });

  it("floors to the nearest whole claim-chain unit", () => {
    expect(quantizeWithdrawAmount(E18 + 1n, 6)).toBe(E18);
    expect(quantizeWithdrawAmount(E18 - 1n, 6)).toBe(E18 - withdrawStep(6));
  });

  it("never returns a negative amount", () => {
    expect(quantizeWithdrawAmount(-5n, 6)).toBe(0n);
  });
});

describe("maxWithdrawable", () => {
  // The devnet trap: pod's native balance maps to 6-decimal L1 USDC, so a MAX
  // that keeps 18 decimals of precision produces an amount admission refuses.
  it("floors a ragged balance to a whole number of claim-chain units", () => {
    const balance = E18 + 123_456_789n; // 1.000000000123456789
    const max = maxWithdrawable(balance, usdc);
    expect(max).toBe(E18);
    expect(max % withdrawStep(usdc.decimals)).toBe(0n);
  });

  it("clamps to the token's maximum, in claim decimals", () => {
    expect(maxWithdrawable(5_000n * E18, usdc)).toBe(1_000n * E18);
  });

  it("is zero when the balance cannot clear the minimum", () => {
    expect(maxWithdrawable(E18 / 2n, usdc)).toBe(0n);
  });

  it("is zero for an empty or negative balance", () => {
    expect(maxWithdrawable(0n, usdc)).toBe(0n);
    expect(maxWithdrawable(-1n, usdc)).toBe(0n);
  });

  it("passes an 18-decimal balance through untouched", () => {
    expect(maxWithdrawable(7n, eighteen)).toBe(7n);
  });

  // A result that isn't itself admissible would make MAX a button that always
  // fails — the one amount the UI offers must survive the node's own check.
  it("always yields an admissible amount", () => {
    for (const balance of [E18, 5_000n * E18, E18 + 999n, 3n * E18 + 1n]) {
      expect(checkWithdrawAmount(maxWithdrawable(balance, usdc), usdc)).toBeUndefined();
    }
  });
});

describe("checkWithdrawAmount", () => {
  it("accepts an exact amount inside the window", () => {
    expect(checkWithdrawAmount(E18, usdc)).toBeUndefined();
  });

  it("names a token with no bridge config", () => {
    expect(checkWithdrawAmount(E18, undefined)?.code).toBe("not_bridged");
  });

  it("names an amount below the minimum", () => {
    expect(checkWithdrawAmount(E18 / 2n, usdc)).toEqual({ code: "below_min", decimals: 6, bound: usdc.min });
  });

  it("names an amount above the maximum", () => {
    expect(checkWithdrawAmount(2_000n * E18, usdc)).toEqual({ code: "above_max", decimals: 6, bound: usdc.max });
  });

  it("names an amount that is not exactly representable", () => {
    expect(checkWithdrawAmount(E18 + 1n, usdc)).toEqual({ code: "not_representable", decimals: 6, step: 10n ** 12n });
  });

  it("rejects a zero or negative amount", () => {
    expect(checkWithdrawAmount(0n, usdc)?.code).toBe("non_positive");
    expect(checkWithdrawAmount(-E18, usdc)?.code).toBe("non_positive");
  });
});

describe("bridgeTokenFor", () => {
  const config = { claimChainId: 42161, sourceContract: L1_USDC, version: 3, tokens: [usdc] };

  it("finds a token by its pod address", () => {
    expect(bridgeTokenFor(config, POD_USDC)).toEqual(usdc);
  });

  // The wire serves lowercase addresses while callers hold checksummed ones;
  // a case-sensitive compare would silently report every token as unbridged.
  it("ignores address casing", () => {
    expect(bridgeTokenFor(config, POD_USDC.toUpperCase().replace("0X", "0x") as Address)).toEqual(usdc);
  });

  it("returns undefined for an unbridged token", () => {
    expect(bridgeTokenFor(config, UNBRIDGED)).toBeUndefined();
  });

  it("returns undefined before the config has loaded", () => {
    expect(bridgeTokenFor(undefined, POD_USDC)).toBeUndefined();
  });
});
