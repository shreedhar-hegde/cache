# SimpleCache

A lightweight, type-safe, in-memory cache implementation for TypeScript/JavaScript with configurable capacity, TTL (time-to-live), and multiple eviction policies.

## Features

- 🚀 **Zero dependencies** - Lightweight and fast
- 🔒 **Type-safe** - Full TypeScript support with generics
- ⏱️ **TTL support** - Global and per-entry time-to-live
- 🎯 **Multiple eviction policies** - LRU, FIFO, Random, None
- 📦 **Dual module support** - Works with both ES modules and CommonJS
- 🌳 **Tree-shakeable** - Optimized for modern bundlers
- ✅ **Well-tested** - Comprehensive test suite with 100% coverage

## Installation

```bash
npm install simple-cache-ts
```

## Quick Start

```typescript
import { SimpleCache } from "simple-cache-ts";

// Basic usage
const cache = new SimpleCache<string, number>();
cache.set("age", 29);
console.log(cache.get("age")); // 29

// With configuration
const apiCache = new SimpleCache<string, unknown>({
  capacity: 100,
  defaultTtl: 60000, // 1 minute
  evictionPolicy: "lru",
});
```

## API Reference

### Constructor

```typescript
new SimpleCache<K, V>(options?: CacheOptions)
```

#### CacheOptions

| Option           | Type             | Default     | Description                                |
| ---------------- | ---------------- | ----------- | ------------------------------------------ |
| `capacity`       | `number`         | `Infinity`  | Maximum number of entries                  |
| `defaultTtl`     | `number`         | `undefined` | Default TTL in milliseconds                |
| `evictionPolicy` | `EvictionPolicy` | `'lru'`     | Eviction strategy when capacity is reached |

#### EvictionPolicy

- `'lru'` - Least Recently Used (default)
- `'fifo'` - First In, First Out
- `'random'` - Random eviction
- `'none'` - Throws error when capacity is reached

### Core Methods

#### `set(key: K, value: V, ttl?: number): void`

Store a value with optional TTL override.

```typescript
cache.set("user", { name: "John" });
cache.set("session", "abc123", 30000); // 30 second TTL
```

#### `get(key: K): V | undefined`

Retrieve a value. Returns `undefined` if key doesn't exist or has expired.

```typescript
const user = cache.get("user");
if (user) {
  console.log(user.name);
}
```

#### `has(key: K): boolean`

Check if a key exists and hasn't expired.

```typescript
if (cache.has("session")) {
  // Session is valid
}
```

#### `delete(key: K): boolean`

Remove a key from the cache. Returns `true` if the key existed.

```typescript
cache.delete("oldSession"); // true if existed
```

#### `clear(): void`

Remove all entries from the cache.

```typescript
cache.clear();
```

#### `size(): number`

Get the current number of entries in the cache.

```typescript
console.log(`Cache has ${cache.size()} entries`);
```

### TTL Utilities

#### `ttl(key: K): number`

Get the remaining TTL for a key in milliseconds.

```typescript
const remaining = cache.ttl("session");
if (remaining > 0) {
  console.log(`Session expires in ${remaining}ms`);
} else if (remaining === -1) {
  console.log("Session has no expiry");
} else {
  console.log("Session does not exist");
}
```

**Return values:**

- `> 0` - Remaining TTL in milliseconds
- `-1` - Key exists but has no expiry
- `-2` - Key does not exist

#### `expire(key: K, ttl: number): boolean`

Set TTL on an existing key. Returns `true` if key exists.

```typescript
cache.expire("session", 60000); // Expire in 1 minute
```

#### `persist(key: K): boolean`

Remove TTL from a key, making it permanent. Returns `true` if key exists.

```typescript
cache.persist("config"); // Remove expiry
```

### Iteration

#### `keys(): IterableIterator<K>`

Get an iterator of all keys.

```typescript
for (const key of cache.keys()) {
  console.log(key);
}

// Or convert to array
const allKeys = Array.from(cache.keys());
```

## Examples

### HTTP API Cache

```typescript
import { SimpleCache } from "simple-cache-ts";

const apiCache = new SimpleCache<string, unknown>({
  capacity: 100,
  evictionPolicy: "lru",
});

async function fetchWithCache(url: string) {
  if (apiCache.has(url)) {
    console.log(`Cache hit: ${url}`);
    return apiCache.get(url);
  }

  console.log(`Fetching: ${url}`);
  const response = await fetch(url);
  const data = await response.json();

  apiCache.set(url, data, 300000); // Cache for 5 minutes
  return data;
}
```

### Session Management

```typescript
const sessionCache = new SimpleCache<string, UserSession>({
  capacity: 1000,
  defaultTtl: 30 * 60 * 1000, // 30 minutes
  evictionPolicy: "lru",
});

function createSession(userId: string): string {
  const sessionId = generateSessionId();
  sessionCache.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

function getSession(sessionId: string): UserSession | null {
  return sessionCache.get(sessionId) || null;
}

function extendSession(sessionId: string): boolean {
  return sessionCache.expire(sessionId, 30 * 60 * 1000);
}
```

### Configuration Cache

```typescript
const configCache = new SimpleCache<string, Config>({
  capacity: 50,
  evictionPolicy: "none", // Throw error instead of evicting
});

function loadConfig(key: string): Config {
  if (configCache.has(key)) {
    return configCache.get(key)!;
  }

  const config = loadConfigFromFile(key);
  configCache.set(key, config); // No TTL - permanent
  return config;
}
```

## Eviction Policies

### LRU (Least Recently Used)

Evicts the item that hasn't been accessed for the longest time. Both `get()` and `set()` operations update the recency.

```typescript
const cache = new SimpleCache({ capacity: 2, evictionPolicy: "lru" });
cache.set("a", 1);
cache.set("b", 2);
cache.get("a"); // 'a' becomes most recent
cache.set("c", 3); // 'b' is evicted (least recent)
```

### FIFO (First In, First Out)

Evicts the oldest inserted item regardless of access patterns.

```typescript
const cache = new SimpleCache({ capacity: 2, evictionPolicy: "fifo" });
cache.set("a", 1);
cache.set("b", 2);
cache.get("a"); // Access doesn't matter
cache.set("c", 3); // 'a' is evicted (oldest)
```

### Random

Evicts a random item when capacity is reached.

```typescript
const cache = new SimpleCache({ capacity: 2, evictionPolicy: "random" });
cache.set("a", 1);
cache.set("b", 2);
cache.set("c", 3); // Either 'a' or 'b' is randomly evicted
```

### None

Throws an error when capacity is reached instead of evicting.

```typescript
const cache = new SimpleCache({ capacity: 1, evictionPolicy: "none" });
cache.set("a", 1);
cache.set("b", 2); // Throws "Cache capacity reached"
```

## TypeScript Usage

SimpleCache is fully typed and supports generic type parameters:

```typescript
// Strongly typed cache
const userCache = new SimpleCache<number, User>();
userCache.set(123, { name: "John", email: "john@example.com" });
const user: User | undefined = userCache.get(123);

// Using with custom types
interface CacheEntry {
  data: unknown;
  metadata: { source: string; timestamp: number };
}

const metaCache = new SimpleCache<string, CacheEntry>();
```

## Performance Characteristics

- **Time Complexity:**
  - `get()`, `set()`, `delete()`, `has()`: O(1) average
  - LRU operations: O(1) (uses Map insertion order)
  - Random eviction: O(n) where n is cache size

- **Space Complexity:** O(capacity)

- **Memory Usage:** Minimal overhead, stores only the data you put in plus small metadata

## Browser and Node.js Support

- **Node.js:** 14+ (ES2020+ features)
- **Browsers:** Chrome 80+, Firefox 72+, Safari 13.1+, Edge 80+
- **Module Systems:** ESM and CommonJS

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the library
npm run build

# Lint and format
npm run lint
npm run format

# Type check
npm run typecheck
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
