// What a perp fill did to the owner's position: opened, added to, reduced, closed
// or flipped it.
//
// A port of `classify_perp_order_direction` in `node/src/rpc/types.rs`, branch for
// branch and in the same order. It exists because the two sources of an order's
// direction have to agree: REST sends the server's label on `OrderResponse`, while
// `pod_orders_v2` sends the raw position and leaves the classification to the
// client. A divergence here would show one label on a streamed row and another after
// a refetch — so this file is a transcription, not an interpretation, and the test
// pins every branch.

import type { OrderDirection } from "../types/public.js";

/**
 * Classify a position transition.
 *
 * `before` is not on the wire: it is `after - sign(size) * filledThisFill`, which is
 * the same arithmetic the engine used to produce the pair (`buy_bookends` /
 * `sell_bookends` in `trading/src/book.rs`), so deriving it loses nothing.
 */
export function classifyPerpDirection(before: bigint, after: bigint): OrderDirection {
  if (before === 0n && after === 0n) return "reduce_long";
  if (before === after) return before > 0n ? "reduce_long" : "reduce_short";
  if (before === 0n && after > 0n) return "open_long";
  if (before === 0n && after < 0n) return "open_short";
  if (before > 0n && after === 0n) return "close_long";
  if (before < 0n && after === 0n) return "close_short";
  if (before > 0n && after < 0n) return "long_to_short";
  if (before < 0n && after > 0n) return "short_to_long";
  if (before > 0n && after > before) return "add_long";
  if (before > 0n && after < before) return "reduce_long";
  if (before < 0n && after < before) return "add_short";
  if (before < 0n && after > before) return "reduce_short";
  // Unreachable, and the Rust returns the same rather than erroring.
  return "open_long";
}
