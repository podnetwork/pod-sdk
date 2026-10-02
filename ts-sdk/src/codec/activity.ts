// `pod_activity` frames -> the order map plus the account's money rows (ADR 0057).
//
// A frame is `pod_orders_v2` for one whole account: the order half folds through
// `applyOrdersFrame` unchanged, and the money half is a set of extra event kinds
// whose `k` tags are disjoint from the order ones. Money has no entity to
// reference and no state to mutate, so each event is decoded straight into the
// entry the REST seed would have served for it.

import type { ActivityEntry, ActivityEvent, Address, Order } from "../types/public.js";
import type { WireActivityFrame, WireMoneyEvent, WireOrdersFrame } from "../types/wire.js";
import { decodeMoneyEvent } from "./decode.js";
import { applyOrdersFrame } from "./orders-v2.js";
import { usToMs } from "./units.js";

export const isMoney = (k: string): k is WireMoneyEvent["k"] =>
  k === "backstop" || k === "bridge_transfer" || k === "transfer";

export interface ActivityState {
  orders: Map<string, Order>;
  entries: ActivityEntry[];
}

export function applyActivityFrame(
  frame: WireActivityFrame,
  state: ActivityState,
  ctx: { account: Address },
): ActivityEvent[] {
  const events: ActivityEvent[] = applyOrdersFrame(frame as WireOrdersFrame, state.orders, ctx);
  const timeMs = usToMs(frame.batch);
  for (const event of frame.events) {
    // Order kinds, and money kinds this version does not know, are ignored rather
    // than handed on — exactly as `applyOrdersFrame` does.
    if (!isMoney(event.k)) continue;
    const entry = decodeMoneyEvent(event as WireMoneyEvent, timeMs);
    state.entries.push(entry);
    events.push(entry);
  }
  return events;
}
