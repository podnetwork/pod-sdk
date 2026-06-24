// OrderHistory: a SeriesResource<Order> seeded from the warm first page, kept
// live by the pod_orders stream (bidder-filtered, `since`-resumed, all update
// variants incl. `modified`), and paged backwards by cursor for deep history.
//
// Reconnect: on every (re)connect we re-seed the first page (authoritative open
// orders) and refresh `since` from its watermark; the WS auto-resubscribes, and
// if `since` is too old (down too long) `onError` re-seeds and resubscribes.

import type { Address, Order, OrderStatus, OrdersQuery } from "../types/public.js";
import type { WireOrderUpdate } from "../types/wire.js";
import { dec } from "../codec/units.js";
import { decodeOrder } from "../codec/decode.js";
import { BaseResource, type ResourceHandle } from "../stores/resource.js";
import type { Subscription } from "../transport/ws.js";
import type { SeriesResource } from "./candles.js";
import type { SyncContext } from "./sources.js";

export class OrderHistory implements SeriesResource<Order> {
  private readonly base: BaseResource<Order[]>;
  private handle: ResourceHandle<Order[]> | undefined;
  private readonly byId = new Map<string, Order>();
  private nextCursor: string | null = null;
  private sub: Subscription | undefined;
  private watermarkUs = 0;
  private alive = false;
  private _hasMore = true;
  private _loading = false;

  constructor(
    private readonly ctx: SyncContext,
    private readonly account: Address,
    private readonly query: OrdersQuery = {},
  ) {
    this.base = new BaseResource<Order[]>((h) => {
      this.handle = h;
      this.alive = true;
      const offOpen = this.ctx.ws.on("open", () => { if (this.alive) this.seed(); });
      this.seed(); // initial paint (REST is independent of the socket being open)
      return () => {
        this.alive = false;
        offOpen();
        this.sub?.unsubscribe();
        this.sub = undefined;
        this.handle = undefined;
      };
    });
  }

  get(): Order[] | undefined { return this.base.get(); }
  subscribe(listener: () => void): () => void { return this.base.subscribe(listener); }
  ready(): Promise<Order[]> { return this.base.ready(); }
  get error(): Error | undefined { return this.base.error; }
  hasMore(): boolean { return this._hasMore; }
  loading(): boolean { return this._loading; }
  destroy(): void { this.base.destroy(); }

  setWindow(): void { /* order history pages by cursor, not by time window */ }

  async loadOlder(): Promise<void> {
    if (!this.handle || !this.nextCursor || this._loading) return;
    this._loading = true;
    this.rebuild();
    try {
      const page = await this.ctx.rest.orders(this.account, {
        cursor: this.nextCursor,
        limit: this.query.limit ?? 100,
      });
      for (const o of page.orders) if (!this.byId.has(o.id)) this.byId.set(o.id, o);
      this.nextCursor = page.nextCursor;
      this._hasMore = page.nextCursor !== null;
    } finally {
      this._loading = false;
      this.rebuild();
    }
  }

  // --- internals ---

  private async fetchFirstPage(): Promise<boolean> {
    try {
      const page = await this.ctx.rest.orders(this.account, { limit: this.query.limit ?? 100 });
      if (!this.alive) return false;
      for (const o of page.orders) this.byId.set(o.id, o);
      this.nextCursor = page.nextCursor;
      this._hasMore = page.nextCursor !== null;
      this.watermarkUs = page.solutionNow * 1000;
      this.rebuild();
      return true;
    } catch (e) {
      if (this.byId.size === 0) this.handle?.fail(e as Error);
      return false;
    }
  }

  private seed(): void {
    void this.fetchFirstPage().then((ok) => {
      if (!ok || !this.alive) return;
      if (!this.sub) {
        this.sub = this.ctx.ws.subscribe(
          "pod_orders",
          { account: this.account, since: this.watermarkUs },
          (r) => this.onUpdates(r),
          () => this.onSubError(),
        );
      } else {
        this.sub.update({ since: this.watermarkUs }); // refresh for the next reconnect
      }
    });
  }

  /** `since` rejected (down too long) — re-seed then resubscribe with a fresh watermark. */
  private onSubError(): void {
    void this.fetchFirstPage().then((ok) => {
      if (!ok) return;
      this.sub?.update({ since: this.watermarkUs });
      this.sub?.resubscribe();
    });
  }

  private onUpdates(result: unknown): void {
    const updates = (Array.isArray(result) ? result : [result]) as WireOrderUpdate[];
    for (const u of updates) this.applyUpdate(u);
    this.rebuild();
  }

  private applyUpdate(u: WireOrderUpdate): void {
    switch (u.type) {
      case "new":
      case "invalid": {
        const o = decodeOrder(u);
        this.byId.set(o.id, o);
        break;
      }
      case "fill": {
        const e = this.byId.get(u.order_id);
        if (e) {
          e.filledBase = dec(u.filled_base_amount);
          e.filledQuote = dec(u.filled_quote_amount);
          e.fee = dec(u.fee);
          e.status = u.status as OrderStatus;
          if (u.effective_price != null) e.effectivePrice = dec(u.effective_price);
        }
        break;
      }
      case "modified": {
        const e = this.byId.get(u.order_id);
        if (e) {
          e.price = dec(u.new_price);
          const sign = e.initialSize < 0n ? -1n : 1n;
          e.initialSize = sign * dec(u.new_size); // new_size is an unsigned magnitude
        }
        break;
      }
      case "expired": {
        const e = this.byId.get(u.order_id);
        if (e) e.status = "expired";
        break;
      }
      case "canceled": {
        const e = this.byId.get(u.order_id);
        if (e) e.status = "canceled";
        break;
      }
    }
  }

  private rebuild(): void {
    if (!this.handle) return;
    let arr = [...this.byId.values()];
    if (this.query.status) arr = arr.filter((o) => o.status === this.query.status);
    if (this.query.orderbookId) arr = arr.filter((o) => o.orderbookId === this.query.orderbookId);
    arr.sort((a, b) => b.deadlineMs - a.deadlineMs || b.nonce - a.nonce);
    this.handle.set(arr);
  }
}
