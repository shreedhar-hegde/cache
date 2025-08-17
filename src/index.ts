import { SimpleCache } from "./simpleCache.js";

// Cache can only hold 2 items, uses LRU eviction
const apiCache = new SimpleCache<string, unknown>({
  capacity: 2,
  evictionPolicy: "lru",
});

async function fetchWithCache(url: string) {
  if (apiCache.has(url)) {
    console.log(`Cache hit: ${url}`);
    return apiCache.get(url);
  }

  console.log(`Fetching: ${url}`);
  const res = await fetch(url);
  const data = await res.json();

  apiCache.set(url, data);
  return data;
}

async function main() {
  const urls = [
    "https://jsonplaceholder.typicode.com/posts/1",
    "https://jsonplaceholder.typicode.com/posts/2",
    "https://jsonplaceholder.typicode.com/posts/3",
    "https://jsonplaceholder.typicode.com/posts/1",
  ];

  for (const url of urls) {
    await fetchWithCache(url);
  }

  console.log("Final cache keys:", Array.from(apiCache.keys()));
  // Expected: only 2 most recently used remain
}

main().catch(console.error);
