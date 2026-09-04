// ── Shared pure helpers ─────────────────────────────────────────────────────

// URL-safe slug used in detail links (?title=…).
export const slugify = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? ''

// Windowed page numbers with ellipses, e.g. for pagination controls.
export const buildPages = (page, totalPages, maxVisible = 5) => {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, page - half)
  let end   = Math.min(totalPages, start + maxVisible - 1)
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)
  if (start > 1) pages.unshift('…start')
  if (end < totalPages) pages.push('…end')
  return pages
}

// TV seasons ascending; Season 0 (Specials) always sorts last.
export const sortSeasons = (seasons = []) =>
  [...seasons].sort((a, b) => {
    const aKey = a.season_number === 0 ? Number.MAX_SAFE_INTEGER : a.season_number
    const bKey = b.season_number === 0 ? Number.MAX_SAFE_INTEGER : b.season_number
    return aKey - bKey
  })
