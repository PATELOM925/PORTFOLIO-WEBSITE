// Daily answer budget for the TTC Pulse Ask chat.
// One Durable Object instance serves every Cloudflare colo, so the count is global and exact.
// It lives in its own Worker: the site Worker binds to it and needs no Durable Object migration of its own.
import { DurableObject } from "cloudflare:workers";

export class ChatBudget extends DurableObject {
  // Takes one unit of `kind` for today (UTC). Returns ok: false when today's count is at the limit.
  async take(kind, limit) {
    const day = new Date().toISOString().slice(0, 10);
    if (this.day !== day) {
      this.day = day;
      const old = await this.ctx.storage.list({ end: day });
      if (old.size) await this.ctx.storage.delete([...old.keys()]);
    }
    const key = `${day}:${kind}`;
    const used = (await this.ctx.storage.get(key)) ?? 0;
    if (used >= limit) return { ok: false, used };
    await this.ctx.storage.put(key, used + 1);
    return { ok: true, used: used + 1 };
  }

  // Today's counts, for the eval health check. Changes nothing.
  async peek() {
    const day = new Date().toISOString().slice(0, 10);
    const rows = await this.ctx.storage.list({ prefix: `${day}:` });
    return Object.fromEntries([...rows].map(([key, value]) => [key.slice(day.length + 1), value]));
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  }
};
