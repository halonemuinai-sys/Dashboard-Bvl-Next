/** Page-owned memory only: never persists sales data or shares it across sessions. */
export function createRequestCache(ttlMs = 60_000, maxEntries = 24, clock = Date.now) {
  const entries = new Map<string, { promise: Promise<unknown>; expires: number }>();
  return {
    clear() { entries.clear(); },
    read<T>(key: string, loader: () => Promise<T>): Promise<T> {
      const existing = entries.get(key);
      if (existing && existing.expires > clock()) return existing.promise as Promise<T>;
      entries.delete(key);
      const entry = { promise: Promise.resolve().then(loader) as Promise<unknown>, expires: Infinity };
      entries.set(key, entry);
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value!);
      entry.promise = entry.promise.then(value => {
        entry.expires = clock() + ttlMs;
        return value;
      }, error => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
      return entry.promise as Promise<T>;
    },
  };
}
export type RequestCache = ReturnType<typeof createRequestCache>;
