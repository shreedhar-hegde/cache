export interface Cache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  clear(): void;
  size(): number;
}

export function createCache<K, V>(): Cache<K, V> {
  const store = new Map<K, V>();

  return {
    get(key) {
      return store.get(key);
    },
    set(key, value) {
      return store.set(key, value);
    },
    has(key) {
      return store.has(key);
    },
    delete(key) {
      return store.delete(key);
    },
    clear() {
      return store.clear();
    },
    size() {
      return store.size;
    },
  };
}
