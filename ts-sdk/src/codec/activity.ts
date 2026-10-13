// `pod_activity` frames -> the order map, plus the money the tick moved (ADR 0057).
//
// A frame is `pod_orders_v2` for one whole account: the order half folds through
// `applyOrdersFrame` unchanged, and the money half is a set of extra event kinds
// whose `k` tags are disjoint from the order ones. Money has no entity to
// reference and no state to mutate, so each event decodes straight into the
// entry it reports — in one pass over `frame.events`, so what a consumer sees is
// the node's own interleaving of the tick.

import type { ActivityEvent, Address, MoneyActivity, Order } from "../types/public.js";
import type { WireActivityFrame, WireMoneyEvent, WireOrderEvent, WireOrdersFrame } from "../types/wire.js";
import { decodeMoneyEvent } from "./decode.js";
import { applyOrdersFrame } from "./orders-v2.js";
import { usToMs } from "./units.js";

const MONEY_KINDS: Record<WireMoneyEvent["k"], true> = {
  backstop: true,
  bridge_transfer: true,
  transfer: true,
};

export const isMoney = (k: string): k is WireMoneyEvent["k"] => Object.hasOwn(MONEY_KINDS, k);

export function applyActivityFrame(
  frame: WireActivityFrame,
  orders: Map<string, Order>,
  ctx: { account: Address },
): ActivityEvent[] {
  const timeMs = usToMs(frame.batch);
  return applyOrdersFrame<MoneyActivity>(frame as WireOrdersFrame, orders, {
    account: ctx.account,
    // Order kinds, and money kinds this version does not know, are ignored rather
    // than handed on — exactly as `applyOrdersFrame` does.
    foreign: (event: WireOrderEvent) =>
      isMoney(event.k) ? decodeMoneyEvent(event as unknown as WireMoneyEvent, timeMs) : undefined,
  });
}
