type Entry<V> = {
  value: V;
  expiry: number | null;
};

export class SimpleCache<K, V> {
  private store = new Map<K, Entry<V>>();
  private capacity: number;
  private ttl: number | null;

  constructor(options?: { capacity?: number; ttl?: number }) {
    this.capacity = options?.capacity ?? Infinity;
    this.ttl = options?.ttl ?? null;
  }

  set(key: K, value: V): void {
    if (this.store.size >= this.capacity) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey != undefined) {
        this.store.delete(oldestKey);
      }
    }
    const expiry = this.ttl ? Date.now() + this.ttl : null;
    this.store.set(key, { value, expiry });
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiry && Date.now() > entry.expiry) {
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
