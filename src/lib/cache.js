const cache = new Map()
const TTL = 5 * 60 * 1000
const MAX_ENTRIES = 200

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
  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
}

export const cachedFetch = async (key, fetcher) => {
  const hit = getCached(key)
  if (hit) return hit
  const data = await fetcher()
  setCached(key, data)
  return data
}