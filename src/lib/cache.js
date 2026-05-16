const cache = new Map()
const TTL = 5 * 60 * 1000 

export const getCached = (key) => {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > TTL) { cache.delete(key); return null }
  return entry.data
}

export const setCached = (key, data) => cache.set(key, { data, ts: Date.now() })

export const cachedFetch = async (key, fetcher) => {
  const hit = getCached(key)
  if (hit) return hit
  const data = await fetcher()
  setCached(key, data)
  return data
}