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

    const cache = new SimpleCache<string, string>({});
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");

    // Set a specific TTL for this entry
    cache.set("key2", "value2", 3000);
    vi.advanceTimersByTime(1000); // move 1s forward

    expect(cache.get("key2")).toBe("value2");

    vi.advanceTimersByTime(1001);

    expect(cache.get("key1")).toBeUndefined();
    expect(cache.get("key2")).toBe("value2");

    vi.useRealTimers();
  });
});
