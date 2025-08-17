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

export class SimpleCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();
  private capacity: number;
  private defaultTtl?: number | undefined;
  private evictionPolicy: EvictionPolicy;

  constructor(options: CacheOptions = {}) {
    this.capacity = options.capacity ?? Infinity;
    this.defaultTtl = options.defaultTtl;
    this.evictionPolicy = options.evictionPolicy ?? "lru";
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return entry.expiry !== undefined && Date.now() > entry.expiry;
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
      if (victim !== undefined) this.store.delete(victim);
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

    this.evictIfNeeded(); // single place to enforce capacity
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiry !== undefined && Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }

    if (this.evictionPolicy === "lru") {
      this.store.delete(key);
      this.store.set(key, entry);
    }
    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
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
}
