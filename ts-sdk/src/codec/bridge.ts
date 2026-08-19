// Withdrawal amount arithmetic (ADR 0033 §2), mirroring the node's
// `WithdrawRules::check_clob_withdraw`.
//
// A CLOB withdrawal's `amount` is in pod's 18 decimals, but it settles on the
// claim chain in that token's decimals — so it has to be a WHOLE number of
// claim-chain units. The node rejects a remainder at admission rather than
// truncating it, which removes dust by construction; these helpers exist so a
// client never offers an amount that will be refused.
//
// The case that bites: pod's native USD maps to 6-decimal L1 USDC on devnet, so
// every native withdrawal must be a multiple of 1e12 wei and the per-token
// `min`/`max` from `/v1/bridge/config` are in those 6 decimals, not 18. A MAX
// button that keeps 18 decimals of precision produces amounts the node refuses.

import type { Address, BridgeConfig, BridgeToken } from "../types/public.js";
import { WAD_DECIMALS } from "./units.js";

/**
 * The 18-decimal step a withdrawal of this token must be a multiple of:
 * `10^(18 − decimals)`, or 1 for a token at least as fine as pod (which can
 * represent every 18-decimal amount, so nothing is quantized away).
 */
export function withdrawStep(decimals: number): bigint {
  return decimals >= WAD_DECIMALS ? 1n : 10n ** BigInt(WAD_DECIMALS - decimals);
}

/** Floor an 18-decimal amount to a whole number of claim-chain units. Never negative. */
export function quantizeWithdrawAmount(amount: bigint, decimals: number): bigint {
  if (amount <= 0n) return 0n;
  const step = withdrawStep(decimals);
  return (amount / step) * step;
}

/**
 * Pod's 18 decimals → the token's claim-chain decimals: what the L1 `claim` call
 * carries and what the claim hash commits to.
 *
 * Throws on a remainder rather than truncating, matching the node's admission
 * check — silently flooring here is exactly the dust this design avoids. Use
 * {@link quantizeWithdrawAmount} when rounding down is what you want.
 */
export function toClaimAmount(amount: bigint, decimals: number): bigint {
  if (decimals > WAD_DECIMALS) return amount * 10n ** BigInt(decimals - WAD_DECIMALS);
  const step = withdrawStep(decimals);
  const remainder = amount % step;
  if (remainder !== 0n) {
    throw new Error(
      `withdraw amount ${amount} is not exactly representable in ${decimals} decimals ` +
      `(remainder ${remainder}); use a multiple of ${step}`,
    );
  }
  return amount / step;
}

/**
 * The claim chain's decimals → pod's 18. Exact by construction: only amounts
 * that were a whole number of claim-chain units are ever admitted, so scaling
 * back up recovers the original.
 */
export function toPodAmount(claimAmount: bigint, decimals: number): bigint {
  if (decimals > WAD_DECIMALS) return claimAmount / 10n ** BigInt(decimals - WAD_DECIMALS);
  return claimAmount * withdrawStep(decimals);
}

/**
 * The largest amount of `balance` that this token's rules actually admit, in
 * pod's 18 decimals: quantized down to a whole claim-chain unit, then clamped
 * into `[min, max]` — which are in claim decimals, so the clamp has to happen
 * after the conversion, not before.
 *
 * `0n` when the balance cannot clear `min`, which is the honest answer: there is
 * no admissible withdrawal at all, and MAX should be disabled rather than
 * offering an amount the node refuses.
 */
export function maxWithdrawable(balance: bigint, token: BridgeToken): bigint {
  if (balance <= 0n) return 0n;
  const claim = toClaimAmount(quantizeWithdrawAmount(balance, token.decimals), token.decimals);
  if (claim < token.min) return 0n;
  return toPodAmount(claim > token.max ? token.max : claim, token.decimals);
}

/**
 * Why the node would refuse a withdrawal, as a code plus the numbers behind it.
 *
 * A code rather than a sentence: this is a published, framework-agnostic
 * package, so the wording belongs to the consumer that renders it — the same
 * way `WithdrawalError` is a code the app turns into words. Each variant carries
 * exactly the numbers its message needs, so a renderer quotes the real bound
 * without re-deriving it and without defaulting fields that cannot be absent.
 */
export type WithdrawRejection =
  /** The token is not in the bridge's set, so it has no claim chain at all. */
  | { code: "not_bridged" }
  | { code: "non_positive"; decimals: number }
  /** `step` is the 18-decimal multiple the amount must be of. */
  | { code: "not_representable"; decimals: number; step: bigint }
  /** `bound` is the limit that was crossed, in claim-chain decimals. */
  | { code: "below_min" | "above_max"; decimals: number; bound: bigint };

/**
 * Why the node would refuse this 18-decimal withdrawal, or `undefined` when it
 * is admissible — the same checks `WithdrawRules::check_clob_withdraw` runs, so
 * a client can disable the button and say why instead of discovering it from a
 * revert.
 *
 * Mirroring the node's rules is deliberate and unlike the claim hash, which the
 * ADR insists on fetching: the values here (`decimals`, `min`, `max`) all come
 * from `/v1/bridge/config`, so only the rule *shape* could drift, and a client
 * has to predict admissibility anyway to render MAX and enable the button.
 *
 * A missing `token` is itself a refusal: with no bridge configured for it there
 * is no chain for the withdrawal to be claimed on.
 */
export function checkWithdrawAmount(
  amount: bigint,
  token: BridgeToken | undefined,
): WithdrawRejection | undefined {
  if (!token) return { code: "not_bridged" };
  const { decimals } = token;
  if (amount <= 0n) return { code: "non_positive", decimals };
  const step = withdrawStep(decimals);
  if (amount % step !== 0n) return { code: "not_representable", decimals, step };
  // Not `amount / step`: a token finer than pod's 18 scales *up*, so the step
  // is 1 and the division would compare the wrong number against the bounds.
  const claim = toClaimAmount(amount, decimals);
  if (claim < token.min) return { code: "below_min", decimals, bound: token.min };
  if (claim > token.max) return { code: "above_max", decimals, bound: token.max };
  return undefined;
}

/** The bridge rules for a pod-side token, or undefined when it isn't bridged. */
export function bridgeTokenFor(
  config: BridgeConfig | undefined,
  podToken: Address,
): BridgeToken | undefined {
  const want = podToken.toLowerCase();
  return config?.tokens.find((t) => t.podToken.toLowerCase() === want);
}
