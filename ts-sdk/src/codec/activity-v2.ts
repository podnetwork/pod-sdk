// `pod_activity_v2` frames -> the order map plus the account's money rows (ADR 0057).
//
// A frame is `pod_orders_v2` for one whole account: the order half folds through
// `applyOrdersFrame` unchanged, and the money half is a set of extra event kinds
// whose `k` tags are disjoint from the order ones. Money has no entity to
// reference and no state to mutate, so each event is decoded straight into the
// entry the REST seed would have served for it.

import type { ActivityEntry, ActivityEvent, Address, MoneyActivity, Order } from "../types/public.js";
import type { WireActivityFrame, WireMoneyEvent, WireOrdersFrame } from "../types/wire.js";
import { applyOrdersFrame } from "./orders-v2.js";
import { dec, usToMs } from "./units.js";

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
    const entry = money(event as WireMoneyEvent, timeMs);
    // `undefined` for every order kind, and for a money kind this version does not
    // know — ignored rather than handed on, exactly as `applyOrdersFrame` does.
    if (!entry) continue;
    state.entries.push(entry);
    events.push(entry);
  }
  return events;
}

function money(event: WireMoneyEvent, timeMs: number): MoneyActivity | undefined {
  switch (event.k) {
    case "backstop":
      return {
        activityType: "backstop",
        timeMs,
        time: timeMs,
        orderbookId: event.book,
        size: dec(event.size),
        cash: dec(event.cash),
        markPrice: dec(event.mark),
        equity: dec(event.equity),
        realizedPnl: dec(event.pnl),
      };
    case "bridge_transfer":
      return {
        activityType: "bridge_transfer",
        timeMs,
        txHash: event.tx,
        idx: event.idx,
        token: event.token,
        amount: dec(event.amount),
        error: event.error || undefined,
      };
    case "transfer":
      return {
        activityType: "transfer",
        timeMs,
        transferId: event.id,
        token: event.token,
        amount: dec(event.amount),
        error: event.error || undefined,
      };
  }
}
