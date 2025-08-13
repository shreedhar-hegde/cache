import { describe, it, expect } from "vitest";
import { createCache } from "../src";

describe("Cache", () => {
  it("sets and retrieves a value", () => {
    const cache = createCache<string, number>();
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
  });

  it("returns undefined for a missing key", () => {
    const cache = createCache<string, number>();
    expect(cache.get("missing")).toBeUndefined();
  });

  it("checks if a key exists", () => {
    const cache = createCache<string, number>();
    cache.set("a", 1);
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  it("deletes a key", () => {
    const cache = createCache<string, number>();
    cache.set("a", 1);
    expect(cache.delete("a")).toBe(true);
    expect(cache.has("a")).toBe(false);
    expect(cache.delete("a")).toBe(false);
  });

  it("clears the cache", () => {
    const cache = createCache<string, number>();
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
