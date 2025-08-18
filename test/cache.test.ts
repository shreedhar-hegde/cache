import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SimpleCache } from "../src/simpleCache.js";

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

      // Test the important properties:
      expect(cache.size()).toBe(2);

      const remainingKeys = Array.from(cache.keys());
      expect(remainingKeys).toHaveLength(2);

      // All remaining keys should be from our original set
      expect(
        remainingKeys.every((key) => ["key1", "key2", "key3"].includes(key)),
      ).toBe(true);

      // Exactly one key should be missing
      const hasKey1 = cache.has("key1");
      const hasKey2 = cache.has("key2");
      const hasKey3 = cache.has("key3");

      const presentCount = [hasKey1, hasKey2, hasKey3].filter(Boolean).length;
      expect(presentCount).toBe(2);
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

  describe("Cache Statistics", () => {
    let cache: SimpleCache<string, number>;

    beforeEach(() => {
      vi.useFakeTimers();
      cache = new SimpleCache<string, number>({ enableStats: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    describe("Basic Stats Tracking", () => {
      it("should track set operations", () => {
        cache.set("key1", 1);
        cache.set("key2", 2);

        const stats = cache.getStats();
        expect(stats.sets).toBe(2);
      });

      it("should track hit operations", () => {
        cache.set("key1", 1);
        cache.get("key1");
        cache.get("key1");

        const stats = cache.getStats();
        expect(stats.hits).toBe(2);
      });

      it("should track miss operations", () => {
        cache.get("nonexistent1");
        cache.get("nonexistent2");

        const stats = cache.getStats();
        expect(stats.misses).toBe(2);
      });

      it("should track delete operations", () => {
        cache.set("key1", 1);
        cache.set("key2", 2);
        cache.delete("key1");
        cache.delete("key2");
        cache.delete("nonexistent"); // Should not increment

        const stats = cache.getStats();
        expect(stats.deletes).toBe(2);
      });
    });

    describe("Hit Rate Calculations", () => {
      it("should calculate correct hit rate", () => {
        cache.set("key1", 1);
        cache.get("key1"); // hit
        cache.get("key1"); // hit
        cache.get("nonexistent"); // miss

        const stats = cache.getStats();
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(1);
        expect(stats.totalRequests).toBe(3);
        expect(stats.hitRate).toBe(66.67);
        expect(stats.missRate).toBe(33.33);
      });

      it("should handle zero requests", () => {
        const stats = cache.getStats();
        expect(stats.hitRate).toBe(0);
        expect(stats.missRate).toBe(0);
        expect(stats.totalRequests).toBe(0);
      });

      it("should handle 100% hit rate", () => {
        cache.set("key1", 1);
        cache.get("key1");
        cache.get("key1");

        const stats = cache.getStats();
        expect(stats.hitRate).toBe(100);
        expect(stats.missRate).toBe(0);
      });

      it("should handle 100% miss rate", () => {
        cache.get("miss1");
        cache.get("miss2");

        const stats = cache.getStats();
        expect(stats.hitRate).toBe(0);
        expect(stats.missRate).toBe(100);
      });
    });

    describe("TTL and Expiration Stats", () => {
      it("should track expired entries as misses", () => {
        cache.set("key1", 1, 1000); // 1 second TTL

        // Advance time to expire the entry
        vi.advanceTimersByTime(2000);

        cache.get("key1"); // Should be expired

        const stats = cache.getStats();
        expect(stats.expires).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hits).toBe(0);
      });

      it("should track multiple expirations", () => {
        cache.set("key1", 1, 1000);
        cache.set("key2", 2, 1000);

        vi.advanceTimersByTime(2000);

        cache.get("key1");
        cache.get("key2");
        cache.has("key1"); // Should also trigger expiration check

        const stats = cache.getStats();
        expect(stats.expires).toBe(2); // 2 from get
        expect(stats.misses).toBe(2);
      });
    });

    describe("Eviction Stats", () => {
      it("should track LRU evictions", () => {
        const lruCache = new SimpleCache<string, number>({
          capacity: 2,
          evictionPolicy: "lru",
          enableStats: true,
        });

        lruCache.set("key1", 1);
        lruCache.set("key2", 2);
        lruCache.set("key3", 3); // Should evict key1

        const stats = lruCache.getStats();
        expect(stats.evictions).toBe(1);
        expect(stats.sets).toBe(3);
      });

      it("should track FIFO evictions", () => {
        const fifoCache = new SimpleCache<string, number>({
          capacity: 2,
          evictionPolicy: "fifo",
          enableStats: true,
        });

        fifoCache.set("key1", 1);
        fifoCache.set("key2", 2);
        fifoCache.set("key3", 3); // Should evict key1
        fifoCache.set("key4", 4); // Should evict key2

        const stats = fifoCache.getStats();
        expect(stats.evictions).toBe(2);
      });

      it("should track random evictions", () => {
        const randomCache = new SimpleCache<string, number>({
          capacity: 1,
          evictionPolicy: "random",
          enableStats: true,
        });

        randomCache.set("key1", 1);
        randomCache.set("key2", 2); // Should evict key1

        const stats = randomCache.getStats();
        expect(stats.evictions).toBe(1);
      });

      it("should not track evictions when policy is none", () => {
        const noneCache = new SimpleCache<string, number>({
          capacity: 1,
          evictionPolicy: "none",
          enableStats: true,
        });

        noneCache.set("key1", 1);

        expect(() => noneCache.set("key2", 2)).toThrow(
          "Cache capacity reached",
        );

        const stats = noneCache.getStats();
        expect(stats.evictions).toBe(0);
      });
    });

    describe("Stats Control", () => {
      it("should allow enabling/disabling stats", () => {
        expect(cache.isStatsEnabled()).toBe(true);

        cache.disableStats();
        expect(cache.isStatsEnabled()).toBe(false);

        cache.enableStats();
        expect(cache.isStatsEnabled()).toBe(true);
      });

      it("should not track stats when disabled", () => {
        cache.disableStats();

        cache.set("key1", 1);
        cache.get("key1");
        cache.get("nonexistent");

        const stats = cache.getStats();
        expect(stats.sets).toBe(0);
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
      });

      it("should create cache with stats disabled", () => {
        const noStatsCache = new SimpleCache<string, number>({
          enableStats: false,
        });

        expect(noStatsCache.isStatsEnabled()).toBe(false);

        noStatsCache.set("key1", 1);
        noStatsCache.get("key1");

        const stats = noStatsCache.getStats();
        expect(stats.sets).toBe(0);
        expect(stats.hits).toBe(0);
      });

      it("should reset stats", () => {
        cache.set("key1", 1);
        cache.get("key1");
        cache.get("nonexistent");

        let stats = cache.getStats();
        expect(stats.sets).toBe(1);
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);

        cache.resetStats();

        stats = cache.getStats();
        expect(stats.sets).toBe(0);
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
        expect(stats.totalRequests).toBe(0);
      });

      it("should reset stats when cleared", () => {
        cache.set("key1", 1);
        cache.get("key1");

        let stats = cache.getStats();
        expect(stats.sets).toBe(1);
        expect(stats.hits).toBe(1);

        cache.clear();

        stats = cache.getStats();
        expect(stats.sets).toBe(0);
        expect(stats.hits).toBe(0);
      });
    });

    describe("Complex Scenarios", () => {
      it("should handle mixed operations correctly", () => {
        // Setup
        cache.set("key1", 1);
        cache.set("key2", 2, 1000); // With TTL

        // Operations
        cache.get("key1"); // hit
        cache.get("key2"); // hit
        cache.get("missing"); // miss

        // Expire key2
        vi.advanceTimersByTime(2000);
        cache.get("key2"); // expired + miss

        // Delete
        cache.delete("key1");

        const stats = cache.getStats();
        expect(stats.sets).toBe(2);
        expect(stats.hits).toBe(2);
        expect(stats.misses).toBe(2);
        expect(stats.deletes).toBe(1);
        expect(stats.expires).toBe(1);
        expect(stats.totalRequests).toBe(4);
        expect(stats.hitRate).toBe(50);
        expect(stats.missRate).toBe(50);
      });

      it("should track overwrite operations correctly", () => {
        cache.set("key1", 1);
        cache.set("key1", 2); // Overwrite
        cache.set("key1", 3); // Overwrite again

        const stats = cache.getStats();
        expect(stats.sets).toBe(3);
      });

      it("should handle LRU updates in stats", () => {
        const lruCache = new SimpleCache<string, number>({
          capacity: 2,
          evictionPolicy: "lru",
          enableStats: true,
        });

        lruCache.set("key1", 1);
        lruCache.set("key2", 2);
        lruCache.get("key1"); // Makes key1 most recent
        lruCache.set("key3", 3); // Should evict key2, not key1

        const stats = lruCache.getStats();
        expect(stats.sets).toBe(3);
        expect(stats.hits).toBe(1);
        expect(stats.evictions).toBe(1);

        // Verify key1 is still there, key2 was evicted
        expect(lruCache.has("key1")).toBe(true);
        expect(lruCache.has("key2")).toBe(false);
        expect(lruCache.has("key3")).toBe(true);
      });
    });

    describe("Performance with Stats", () => {
      it("should have minimal performance impact when stats enabled", () => {
        const iterations = 10000;

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          cache.set(`key${i}`, i);
          cache.get(`key${i}`);
        }
        const end = performance.now();

        const stats = cache.getStats();
        expect(stats.sets).toBe(iterations);
        expect(stats.hits).toBe(iterations);
        expect(stats.hitRate).toBe(100);

        // Should complete reasonably quickly (adjust threshold as needed)
        expect(end - start).toBeLessThan(1000);
      });
    });
  });
});
