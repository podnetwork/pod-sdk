// Order state built from REST reads, with the stream frames above them replayed on top.
//
// `base` holds each order as a REST read reported it, with the tick it was read at.
// `frames` holds the stream frames above `stampUs`, the tick activity has been
// reconciled to. `view` is what consumers see: `base` with `frames` replayed, kept
// current frame by frame in between.

import type { ActivityType, Address, Order } from "../types/public.js";
import type { ActivityPage, PodRestClient } from "../transport/rest.js";
import { decodeOrder } from "../codec/decode.js";
import { asOrderEvent } from "../codec/activity.js";
import { applyEvent } from "../codec/orders-v2.js";
import { usToMs } from "../codec/units.js";
import { readAtLeast } from "./sources.js";

const MAX_FRAMES = 1_024;

export class OrderLedger<F, E> {
  readonly view = new Map<string, Order>();
  /** Activity has been reconciled up to this tick. */
  stampUs = 0;
  private readonly base = new Map<string, { order: Order; atUs: number }>();
  private frames: Array<[number, F]> = [];
  private floorUs = 0;
  private newestRowUs = 0;

  constructor(private readonly fold: (frame: F, orders: Map<string, Order>) => E) {}

  /** The lowest stamp a reconcile may answer at without a hole under the held frames. */
  minimum(): number {
    return Math.max(this.stampUs, this.floorUs);
  }

  /**
   * Apply a stream frame to `view`, and hold it for replay. An order a REST read already
   * has at `us` keeps that state, but the frame still reports its events on a copy.
   */
  live(us: number, frame: F): E {
    const result = this.foldPast(us, frame, this.view);
    if (us > this.stampUs) {
      let i = this.frames.length;
      while (i > 0 && this.frames[i - 1]![0] > us) i--;
      this.frames.splice(i, 0, [us, frame]);
      if (this.frames.length > MAX_FRAMES) this.floorUs = this.frames.shift()![0];
    }
    return result;
  }

  /** Orders a REST read reported at `atUs`; a held order read later is kept. */
  rows(orders: Order[], atUs: number): void {
    const taken: string[] = [];
    for (const order of orders) {
      const held = this.base.get(order.id);
      if (held && held.atUs > atUs) continue;
      this.base.set(order.id, { order, atUs });
      taken.push(order.id);
    }
    this.newestRowUs = Math.max(this.newestRowUs, atUs);
    const scratch = new Map<string, Order>();
    this.replay(taken, scratch);
    for (const id of taken) this.put(id, scratch.get(id)!);
  }

  /**
   * Apply activity read from `stampUs` up to R, the newest page's stamp, then move the
   * stamp to R and replay the frames above it. `false` when R is below the stamp.
   */
  reconcile(pages: ActivityPage[]): boolean {
    const r = pages[0]?.solutionNowUs;
    if (r === undefined || r < this.stampUs) return false;
    const batches = pages
      .flatMap((p) => p.batches.map(([batchUs, entries]) => ({ batchUs, entries, atUs: p.solutionNowUs })))
      .sort((a, b) => a.batchUs - b.batchUs);
    const rowed = new Set(batches.flatMap((b) => b.entries.flatMap((e) => (e.k === "order" ? [e.order_id] : []))));
    for (const { batchUs, entries, atUs } of batches) {
      for (const e of entries) {
        if (e.k === "order") {
          const held = this.base.get(e.order_id);
          if (!held || held.atUs <= atUs) this.base.set(e.order_id, { order: decodeOrder(e), atUs });
          this.newestRowUs = Math.max(this.newestRowUs, atUs);
          continue;
        }
        const event = asOrderEvent(e);
        if (!event?.id || rowed.has(event.id)) continue;
        const held = this.base.get(event.id);
        if (held && batchUs > held.atUs) applyEvent(event, held.order, { batchMs: usToMs(batchUs) });
      }
    }
    for (const held of this.base.values()) held.atUs = Math.max(held.atUs, r);
    this.newestRowUs = Math.max(this.newestRowUs, r);
    this.stampUs = r;
    this.frames = this.frames.filter(([us]) => us > r);
    if (this.floorUs <= r) this.floorUs = 0;

    const fresh = new Map<string, Order>();
    this.replay(this.base.keys(), fresh);
    // Orders only the stream knows keep their streamed state.
    for (const [id, order] of fresh) this.put(id, order);
    return true;
  }

  private replay(ids: Iterable<string>, into: Map<string, Order>): void {
    for (const id of ids) into.set(id, { ...this.base.get(id)!.order });
    for (const [us, frame] of this.frames) this.foldPast(us, frame, into);
  }

  /** Fold `frame` into `orders`; the orders whose REST state is at or past `us` take it on a copy that is thrown away. */
  private foldPast(us: number, frame: F, orders: Map<string, Order>): E {
    if (us > this.newestRowUs) return this.fold(frame, orders);
    const hidden: Order[] = [];
    for (const [id, order] of orders) {
      const held = this.base.get(id);
      if (held && held.atUs >= us) { hidden.push(order); orders.set(id, { ...order }); }
    }
    const result = this.fold(frame, orders);
    for (const order of hidden) orders.set(order.id, order);
    return result;
  }

  /** Overwrite in place: activity rows hold the view's order objects. */
  private put(id: string, order: Order): void {
    const shown = this.view.get(id);
    if (!shown) { this.view.set(id, order); return; }
    if (shown === order) return;
    for (const key of Object.keys(shown)) delete (shown as unknown as Record<string, unknown>)[key];
    Object.assign(shown, order);
  }
}

/** Activity from `fromUs` (exclusive) to the newest tick, every page, newest first. */
export async function readActivityAfter(
  rest: PodRestClient,
  account: Address,
  fromUs: number,
  minUs: number,
  types?: ActivityType[],
): Promise<ActivityPage[]> {
  const pages: ActivityPage[] = [];
  let toUs: number | undefined;
  do {
    const page = await readAtLeast((min) => rest.activity(account, { types, fromUs: fromUs + 1, toUs }, min), minUs);
    pages.push(page);
    toUs = page.nextUs ?? undefined;
  } while (toUs !== undefined);
  return pages;
}
