type Entry<V> = {
  value: V;
  expiry: number | null;
};

export class SimpleCache<K, V> {
  private store = new Map<K, Entry<V>>();
  private capacity: number;
  private defaultTtl: number = 2000;

  constructor(options?: { capacity?: number; defaultTtl?: number }) {
    this.capacity = options?.capacity ?? Infinity;
    this.defaultTtl = options?.defaultTtl ?? this.defaultTtl;
  }

  set(key: K, value: V, itemTtl?: number): void {
    const ttl = itemTtl ?? this.defaultTtl;
    const expiry = ttl > 0 ? Date.now() + ttl : null;

    if (this.store.size >= this.capacity) {
      // FIFO eviction
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, { value, expiry });
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
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
