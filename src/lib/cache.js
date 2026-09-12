const cache = new Map()
// In-flight promise dedup: concurrent callers for the same key share one
// request instead of racing the network (React StrictMode double-mounts,
// the carousel and genre map firing together, …). Failed requests are never
// cached — the entry is dropped so the next caller retries.
const inFlight = new Map()
const TTL = 5 * 60 * 1000
const MAX_ENTRIES = 200

let cleanupTimer = null
const scheduleCleanup = () => {
  if (cleanupTimer) return
  cleanupTimer = setTimeout(() => {
    cleanupTimer = null
    const now = Date.now()
    for (const [key, entry] of cache.entries()) {
      if (now - entry.ts > TTL) cache.delete(key)
    }
  }, TTL)
}

const getCached = (key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) { cache.delete(key); return null }
  return entry.data
}

const setCached = (key, data) => {
  // Re-insert to keep recency order, then evict the oldest entry if over budget.
  if (cache.has(key)) cache.delete(key)
  cache.set(key, { data, ts: Date.now() })
  scheduleCleanup()
  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
}

export const cachedFetch = async (key, fetcher) => {
  const hit = getCached(key)
  if (hit) return hit

  const pending = inFlight.get(key)
  if (pending) return pending

  const promise = (async () => {
    try {
      const data = await fetcher()
      setCached(key, data)
      return data
    } finally {
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, promise)
  return promise
}