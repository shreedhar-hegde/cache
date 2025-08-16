type CacheEntry<V> = {
  value: V;
  expiry: number | null; // null = never expire
};

interface CacheOptions {
  capacity?: number; // max entries before eviction
  defaultTtl?: number; // default TTL in ms (optional)
}

export class SimpleCache<K, V> {
  private store: Map<K, CacheEntry<V>>;
  private capacity: number;
  private defaultTtl?: number | undefined;

  constructor(options: CacheOptions = {}) {
    this.capacity = options.capacity ?? Infinity;
    this.defaultTtl = options.defaultTtl;
    this.store = new Map();
  }

  private isExpired(entry: CacheEntry<V>): boolean {
    return entry.expiry !== null && Date.now() > entry.expiry;
  }

  private touch(key: K, entry: CacheEntry<V>) {
    this.store.delete(key);
    this.store.set(key, entry);
  }

  set(key: K, value: V, itemTtl?: number): void {
    let ttl: number | undefined;

    if (itemTtl !== undefined) {
      ttl = itemTtl;
    } else if (this.defaultTtl !== undefined) {
      ttl = this.defaultTtl;
    }

    const expiry =
      ttl !== undefined && ttl !== Infinity ? Date.now() + ttl : null;
    const entry: CacheEntry<V> = { value, expiry };

    if (this.store.has(key)) {
      this.touch(key, entry);
      return;
    }

    if (this.store.size >= this.capacity) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, entry);
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return undefined;
    }

    // Refresh recency for LRU
    this.touch(key, entry);
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
}
