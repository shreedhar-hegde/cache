type EvictionPolicy = "lru" | "fifo" | "random" | "none";

interface CacheOptions {
  capacity?: number;
  defaultTtl?: number;
  evictionPolicy?: EvictionPolicy;
}

interface CacheEntry<V> {
  value: V;
  expiry?: number | undefined; // timestamp in ms
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  expires: number;
  hitRate: number;
  missRate: number;
  totalRequests: number;
}

export class SimpleCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();
  private capacity: number;
  private defaultTtl?: number | undefined;
  private evictionPolicy: EvictionPolicy;

  private stats: Omit<CacheStats, "hitRate" | "missRate" | "totalRequests"> = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    expires: 0,
  };

  private statsEnabled: boolean;

  constructor(options: CacheOptions & { enableStats?: boolean } = {}) {
    this.capacity = options.capacity ?? Infinity;
    this.defaultTtl = options.defaultTtl;
    this.evictionPolicy = options.evictionPolicy ?? "lru";
    this.statsEnabled = options.enableStats ?? false;
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return entry.expiry !== undefined && Date.now() > entry.expiry;
  }

  private recordStat(
    stat: keyof Omit<CacheStats, "hitRate" | "missRate" | "totalRequests">,
  ): void {
    if (this.statsEnabled) {
      this.stats[stat]++;
    }
  }

  private evictIfNeeded() {
    while (this.store.size > this.capacity) {
      let victim: K | undefined;

      switch (this.evictionPolicy) {
        case "lru":
        case "fifo":
          victim = this.store.keys().next().value;
          break;
        case "random":
          const keys = Array.from(this.store.keys());
          victim = keys[Math.floor(Math.random() * keys.length)];
          break;
        case "none":
          throw new Error("Cache capacity reached");
      }
      if (victim !== undefined) {
        this.store.delete(victim);
        this.recordStat("evictions");
      }
    }
  }

  set(key: K, value: V, ttl?: number): void {
    const expiry =
      ttl !== undefined
        ? Date.now() + ttl
        : this.defaultTtl !== undefined
          ? Date.now() + this.defaultTtl
          : undefined;

    // overwrite refreshes recency
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiry });

    this.recordStat("sets");
    this.evictIfNeeded(); // single place to enforce capacity
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.recordStat("misses");
      return undefined;
    }

    if (entry.expiry !== undefined && Date.now() > entry.expiry) {
      this.store.delete(key);
      this.recordStat("expires");
      this.recordStat("misses");
      return undefined;
    }

    if (this.evictionPolicy === "lru") {
      this.store.delete(key);
      this.store.set(key, entry);
    }

    this.recordStat("hits");
    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.recordStat("expires");
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    const deleted = this.store.delete(key);
    if (deleted) {
      this.recordStat("deletes");
    }
    return deleted;
  }

  clear(): void {
    this.store.clear();
    if (this.statsEnabled) {
      this.resetStats();
    }
  }

  size(): number {
    return this.store.size;
  }

  ttl(key: K): number {
    const entry = this.store.get(key);
    if (!entry) return -2; // redis convention: -2 = no key
    if (!entry.expiry) return -1; // -1 = no expiry
    return Math.max(0, entry.expiry - Date.now());
  }

  expire(key: K, ttl: number): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    entry.expiry = Date.now() + ttl;
    return true;
  }

  persist(key: K): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    entry.expiry = undefined;
    return true;
  }

  keys(): IterableIterator<K> {
    return this.store.keys();
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: totalRequests
        ? Number(((this.stats.hits / totalRequests) * 100).toFixed(2))
        : 0,
      missRate: totalRequests
        ? Number(((this.stats.misses / totalRequests) * 100).toFixed(2))
        : 0,
      totalRequests,
    };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      expires: 0,
    };
  }

  enableStats(): void {
    this.statsEnabled = true;
  }

  disableStats(): void {
    this.statsEnabled = false;
  }

  isStatsEnabled(): boolean {
    return this.statsEnabled;
  }
}
