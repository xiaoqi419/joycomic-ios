// ApiCache — 轻量 API 响应缓存（内存 + TTL）
// @author Jason

interface Entry<T> {
  data: T;
  expiry: number;
}

export const CACHE_TTL = {
  setting: 300_000,       // 5min
  promote: 120_000,       // 2min
  album: 120_000,          // 2min
  comic_read: 60_000,     // 1min
  latest: 60_000,         // 1min
  search: 60_000,         // 1min
  default: 30_000,        // 30s
} as const;

class ApiCache {
  private store = new Map<string, Entry<any>>();

  get<T>(key: string): T | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() > e.expiry) { this.store.delete(key); return null; }
    return e.data as T;
  }

  set<T>(key: string, data: T, ttl = CACHE_TTL.default): void {
    this.store.set(key, { data, expiry: Date.now() + ttl });
  }

  clear(): void { this.store.clear(); }
}

export const apiCache = new ApiCache();
