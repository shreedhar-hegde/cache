import { describe, it, expect, vi } from "vitest";
import { SimpleCache } from "../src";

describe("SimpleCache", () => {
  it("should set and get values", () => {
    const cache = new SimpleCache<string, string>();
    cache.set("name", "shreedhar");
    expect(cache.get("name")).toBe("shreedhar");
  });

  it("should return size of cache", () => {
    const cache = new SimpleCache<string, string>();
    expect(cache.size()).toBe(0);
    cache.set("age", "29");
    cache.set("city", "Bengaluru");
    expect(cache.size()).toBe(2);
  });

  it("should return undefined for non-existent keys", () => {
    const cache = new SimpleCache<string, string>();
    expect(cache.get("nonExistentKey")).toBeUndefined();
  });

  it("should check if a key exists", () => {
    const cache = new SimpleCache<string, string>();
    cache.set("exists", "yes");
    expect(cache.has("exists")).toBe(true);
    expect(cache.has("nonExistentKey")).toBe(false);
  });

  it("should delete a key", () => {
    const cache = new SimpleCache<string, string>();
    cache.set("toDelete", "value");
    expect(cache.has("toDelete")).toBe(true);
    cache.delete("toDelete");
    expect(cache.has("toDelete")).toBe(false);
  });

  it("should clear the cache", () => {
    const cache = new SimpleCache<string, string>();
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    expect(cache.size()).toBe(2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });

  it("should respect cache capacity", () => {
    const cache = new SimpleCache<string, string>({ capacity: 2 });
    cache.set("key1", "value1");
    cache.set("key2", "value2");
    expect(cache.size()).toBe(2);
    cache.set("key3", "value3");
    expect(cache.size()).toBe(2);
    expect(cache.has("key1")).toBe(false); // key1 should be evicted
  });

  it("should return undefined after TTL expires", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date()); // baseline

    const cache = new SimpleCache<string, string>({ defaultTtl: 1000 });
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    vi.advanceTimersByTime(1001); // move 1 ms beyond expiry

    expect(cache.get("key1")).toBeUndefined();

    vi.useRealTimers();
  });

  it("should evict oldest entry when over capacity", () => {
    const cache = new SimpleCache<string, string>({ capacity: 2 });

    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.set("key3", "value3");

    expect(cache.has("key1")).toBe(false);
    expect(cache.has("key2")).toBe(true);
    expect(cache.has("key3")).toBe(true);
  });

  it("should respect entry specific TTL over global TTL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date()); // baseline

    const cache = new SimpleCache<string, string>({ defaultTtl: 2000 });
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    // Set a specific TTL for this entry
    cache.set("key2", "value2", 3000);
    vi.advanceTimersByTime(1000); // move 1s forward

    expect(cache.get("key2")).toBe("value2");

    vi.advanceTimersByTime(1001);

    expect(cache.get("key1")).toBeUndefined(); // expired by 2000ms global
    expect(cache.get("key2")).toBe("value2"); // still valid (3000ms specific)

    vi.useRealTimers();
  });

  it("should expire entries based on global TTL", () => {
    vi.useFakeTimers();
    const cache = new SimpleCache<string, string>({ defaultTtl: 3000 });
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
    vi.advanceTimersByTime(2000); // move 2s forward
    expect(cache.get("key1")).toBe("value1");
    vi.advanceTimersByTime(1001); // move 1s beyond expiry
    expect(cache.get("key1")).toBeUndefined();
    vi.useRealTimers();
  });

  it("should evict least recently used entry when over capacity", () => {
    const cache = new SimpleCache<string, string>({ capacity: 2 });

    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.get("key1"); // Access key1 to make it recently used
    cache.set("key3", "value3"); // This should evict key1

    expect(cache.get("key1")).toBe("value1");
    expect(cache.get("key2")).toBeUndefined(); // key2 should be evicted
    expect(cache.get("key3")).toBe("value3");
  });

  it("should update recency when value is overwritten", () => {
    const cache = new SimpleCache<string, string>({ capacity: 2 });

    cache.set("key1", "value1");
    cache.set("key2", "value2");
    cache.set("key1", "newValue1"); // Update key1
    cache.set("key3", "value3"); // This should evict key2

    expect(cache.get("key1")).toBe("newValue1");
    expect(cache.get("key2")).toBeUndefined(); // key2 should be evicted
    expect(cache.get("key3")).toBe("value3");
  });

  describe("Eviction policies", () => {
    it("should evict least recently used (LRU)", () => {
      const cache = new SimpleCache<string, string>({
        capacity: 2,
        evictionPolicy: "lru",
      });

      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.get("key1");

      cache.set("key3", "value3");

      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
      expect(cache.has("key3")).toBe(true);
    });

    it("should evict first in first out (FIFO)", () => {
      const cache = new SimpleCache<string, string>({
        capacity: 2,
        evictionPolicy: "fifo",
      });

      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(true);
      expect(cache.has("key3")).toBe(true);
    });

    it("should evict random key when over capacity (RANDOM)", () => {
      const cache = new SimpleCache<string, string>({
        capacity: 2,
        evictionPolicy: "random",
      });

      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      //expect any of the keys to be evicted
      expect(cache.has("key1") || cache.has("key2") || cache.has("key3")).toBe(
        true
      );
      expect(cache.size()).toBe(2); // Only
    });

    it("should throw error when eviction policy is NONE", () => {
      const cache = new SimpleCache<string, string>({
        capacity: 1,
        evictionPolicy: "none",
      });
      cache.set("key1", "value1"); // fills capacity
      expect(() => {
        cache.set("key2", "value2");
      }).toThrow("Cache capacity reached");
    });
  });

  describe("TTL Utilities", () => {
    it("should return correct TTL value", () => {
      vi.useFakeTimers();

      const cache = new SimpleCache<string, string>({});

      cache.set("key1", "value1", 5000);

      expect(cache.ttl("key1")).toBe(5000);

      vi.advanceTimersByTime(2000);
      expect(cache.ttl("key1")).toBeGreaterThanOrEqual(3000);

      vi.useRealTimers();
    });

    it("should return -1 no expiry", () => {
      const cache = new SimpleCache<string, string>({});

      cache.set("key1", "value1");
      expect(cache.ttl("key1")).toBe(-1);
    });

    it("should return -2 for non-existent keys", () => {
      const cache = new SimpleCache<string, string>({});
      expect(cache.ttl("nonExistentKey")).toBe(-2);
    });

    it("should allow updating expiry using expire()", () => {
      vi.useFakeTimers();

      const cache = new SimpleCache<string, string>({});

      cache.set("key1", "value1");
      expect(cache.expire("key1", 2000)).toBe(true);

      vi.advanceTimersByTime(2001);
      expect(cache.get("key1")).toBeUndefined();
      vi.useRealTimers();
    });

    it("should allow removing expiry using persist()", () => {
      vi.useFakeTimers();

      const cache = new SimpleCache<string, string>({});

      cache.set("key1", "value1", 2000);
      expect(cache.persist("key1")).toBe(true);

      vi.advanceTimersByTime(3000);
      expect(cache.get("key1")).toBe("value1");
      vi.useRealTimers();
    });
  });
});
