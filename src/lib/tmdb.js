import { cachedFetch } from './cache'

const BASE_URL   = 'https://api.themoviedb.org/3'
export const IMAGE_BASE = 'https://image.tmdb.org/t/p'

export const MEDIA_TYPES = {
  movie: 'movie',
  tv:    'tv',
}

// ── Per-type TMDB configuration ─────────────────────────────────────────────
// Everything that differs between Movies and TV Series lives here so the
// generic fetch helpers below stay type-agnostic.
const MEDIA_CONFIG = {
  movie: {
    titleKey:      'title',
    dateKey:       'release_date',
    yearParam:     'primary_release_year',
    dateParam:     'primary_release_date',
    discoverPath:  '/discover/movie',
    searchPath:    '/search/movie',
    genresPath:    '/genre/movie/list',
    trendingPath:  '/trending/movie/week',
    popularPath:   '/movie/popular',
    detailsPath:   (id) => `/movie/${id}`,
    similarPaths:  (id) => [`/movie/${id}/recommendations`, `/movie/${id}/similar`],
  },
  tv: {
    titleKey:      'name',
    dateKey:       'first_air_date',
    yearParam:     'first_air_date_year',
    dateParam:     'first_air_date',
    discoverPath:  '/discover/tv',
    searchPath:    '/search/tv',
    genresPath:    '/genre/tv/list',
    trendingPath:  '/trending/tv/week',
    popularPath:   '/tv/popular',
    detailsPath:   (id) => `/tv/${id}`,
    similarPaths:  (id) => [`/tv/${id}/recommendations`, `/tv/${id}/similar`],
  },
}

export const mediaTitle = (item) => item?.title ?? item?.name ?? ''
export const mediaYear  = (item) => String(item?.release_date || item?.first_air_date || '').slice(0, 4)
export const mediaDate  = (item) => item?.release_date || item?.first_air_date || null

// ── Search relevance ranking ────────────────────────────────────────────────
// TMDB returns good search results, but mixing movies + TV or long tail pages
// can bury the obvious match. This re-orders results so the most relevant,
// most popular titles surface first:
//   1. Exact title match
//   2. Title starts with the whole query
//   3. Title contains the whole query
//   4. Every query word appears in the title (as token or prefix)
//   5. Popularity (capped) as a tiebreaker — never overrides title relevance
// It never invents or hardcodes results; it only re-orders what TMDB returned.
const normalizeText = (s) => String(s ?? '').toLowerCase().trim()

export const rankSearchResults = (query = '', results = []) => {
  const q = normalizeText(query)
  if (!q || !Array.isArray(results) || results.length < 2) return results

  const qTokens = q.split(/[^a-z0-9]+/).filter(Boolean)

  const scored = results.map((item) => {
    const title    = normalizeText(mediaTitle(item))
    const original = normalizeText(item.original_title || item.original_name || '')
    const candidates = [title, original].filter(Boolean)
    let score = 0

    if (candidates.includes(q)) {
      score += 1_000_000               // exact match
    } else if (candidates.some(t => t.startsWith(q))) {
      score += 800_000                 // starts with the full query
    } else if (candidates.some(t => t.includes(q))) {
      score += 500_000                 // contains the full query
    }

    // Word coverage: share of query tokens found in the title/original.
    if (qTokens.length > 1) {
      const titleTokens = title.split(/[^a-z0-9]+/).filter(Boolean)
      const originalTokens = original.split(/[^a-z0-9]+/).filter(Boolean)
      const tokens = new Set([...titleTokens, ...originalTokens])
      let hits = 0
      for (const token of qTokens) {
        if ([...tokens].some(t => t === token || t.startsWith(token) || token.startsWith(t))) hits++
      }
      score += (hits / qTokens.length) * 300_000
    }

    // Popularity: relevant when titles tie, capped so it stays a tiebreak.
    const popularity = Number(item.popularity) || 0
    score += Math.min(popularity, 1000) * 100

    return { item, score, popularity }
  })

  return scored
    .sort((a, b) => b.score - a.score || b.popularity - a.popularity)
    .map(s => s.item)
}

const getHeaders = () => ({
  accept: 'application/json',
  Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}`,
})

export const fetchTMDB = async (path, params = {}) => {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  })
  const res = await fetch(url.toString(), { method: 'GET', headers: getHeaders() })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`TMDB ${res.status}: ${text || 'Request failed'}`)
  }
  return res.json()
}

export const getPosterUrl   = (path, size = 'w342')     => path ? `${IMAGE_BASE}/${size}${path}` : null
export const getBackdropUrl = (path, size = 'original') => path ? `${IMAGE_BASE}/${size}${path}` : null
export const getProfileUrl  = (path, size = 'w185')     => path ? `${IMAGE_BASE}/${size}${path}` : null

// ── Category tabs per type ───────────────────────────────────────────────────
const movieCategories = [
  { id: 'all',         label: 'All Movies',   sortBy: 'popularity.desc',          extraParams: {} },
  { id: 'popular',     label: 'Popular',      sortBy: 'popularity.desc',          extraParams: { 'vote_count.gte': 50 } },
  { id: 'most_viewed', label: 'Most Viewed',  sortBy: 'vote_count.desc',          extraParams: { 'vote_count.gte': 1000 } },
  { id: 'top_rated',   label: 'Top Rated',    sortBy: 'vote_average.desc',        extraParams: { 'vote_count.gte': 300 } },
  {
    id: 'latest', label: 'Latest', sortBy: 'primary_release_date.desc',
    extraParams: { 'vote_count.gte': 5, 'primary_release_date.lte': new Date().toISOString().split('T')[0] },
  },
]

const tvCategories = [
  { id: 'all',         label: 'All TV Shows', sortBy: 'popularity.desc',          extraParams: {} },
  { id: 'popular',     label: 'Popular',      sortBy: 'popularity.desc',          extraParams: { 'vote_count.gte': 20 } },
  { id: 'most_viewed', label: 'Most Viewed',  sortBy: 'vote_count.desc',          extraParams: { 'vote_count.gte': 300 } },
  { id: 'top_rated',   label: 'Top Rated',    sortBy: 'vote_average.desc',        extraParams: { 'vote_count.gte': 100 } },
  {
    id: 'latest', label: 'Latest', sortBy: 'first_air_date.desc',
    extraParams: { 'vote_count.gte': 5, 'first_air_date.lte': new Date().toISOString().split('T')[0] },
  },
]

export const CATEGORIES = { movie: movieCategories, tv: tvCategories }

// Decade → date range mapping (field name is applied per type later)
const DECADE_RANGES = {
  '2020s': { gte: '2020-01-01', lte: `${new Date().getFullYear()}-12-31` },
  '2010s': { gte: '2010-01-01', lte: '2019-12-31' },
  '2000s': { gte: '2000-01-01', lte: '2009-12-31' },
  '1990s': { gte: '1990-01-01', lte: '1999-12-31' },
}

export const buildDiscoverParams = (mediaType, categoryId, filters = {}, page = 1) => {
  const config = MEDIA_CONFIG[mediaType]
  const list   = CATEGORIES[mediaType] ?? []
  const cat    = list.find(c => c.id === categoryId) ?? list[0]
  const params = { page, include_adult: false, language: 'en-US', sort_by: cat.sortBy, ...cat.extraParams }

  // Multi-genre support
  if (filters.genreIds?.length) params.with_genres = filters.genreIds.join(',')

  // Year: single year or decade range (date field differs per type)
  if (filters.year) {
    const range = DECADE_RANGES[filters.year]
    if (range) {
      params[`${config.dateParam}.gte`] = range.gte
      params[`${config.dateParam}.lte`] = range.lte
    } else {
      params[config.yearParam] = filters.year
    }
  }

  if (filters.minRating) {
    const existing = parseFloat(params['vote_average.gte'] ?? 0)
    params['vote_average.gte'] = Math.max(existing, parseFloat(filters.minRating))
    if (!params['vote_count.gte']) params['vote_count.gte'] = 50
  }

  return params
}

const withMediaType = (mediaType, results = []) =>
  results.map(item => ({ ...item, media_type: mediaType }))

export const fetchDiscover = (mediaType, categoryId, filters, page) => {
  const params = buildDiscoverParams(mediaType, categoryId, filters, page)
  const key    = `discover:${mediaType}:${JSON.stringify(params)}`
  return cachedFetch(key, () =>
    fetchTMDB(MEDIA_CONFIG[mediaType].discoverPath, params)
      .then(data => ({ ...data, results: withMediaType(mediaType, data.results) }))
  )
}

export const fetchSearch = (mediaType, query, page = 1) => {
  const config = MEDIA_CONFIG[mediaType]
  const key = `search:${mediaType}:${query}:${page}`
  return cachedFetch(key, () =>
    fetchTMDB(config.searchPath, { query, page, include_adult: false, language: 'en-US' })
      .then(data => ({ ...data, results: rankSearchResults(query, withMediaType(mediaType, data.results)) }))
  )
}

export const fetchGenres = (mediaType) => {
  const config = MEDIA_CONFIG[mediaType]
  return cachedFetch(`genres:${mediaType}`, () =>
    fetchTMDB(config.genresPath, { language: 'en-US' }).then(d => d.genres ?? [])
  )
}

export const fetchDetails = (mediaType, id) => {
  const config = MEDIA_CONFIG[mediaType]
  return cachedFetch(`detail:${mediaType}:${id}`, () =>
    fetchTMDB(config.detailsPath(id), { append_to_response: 'credits', language: 'en-US' })
  )
}

// TV only — full episode list for one season of a show
export const fetchSeasonEpisodes = (tvId, seasonNumber) =>
  cachedFetch(`season:${tvId}:${seasonNumber}`, () =>
    fetchTMDB(`/tv/${tvId}/season/${seasonNumber}`, { language: 'en-US' })
  )

export const fetchSimilar = (mediaType, id) => {
  const config   = MEDIA_CONFIG[mediaType]
  const [primary, fallback] = config.similarPaths(id)
  return cachedFetch(`similar:${mediaType}:${id}`, () =>
    fetchTMDB(primary, { language: 'en-US', page: 1 })
      .then(d => {
        if ((d.results ?? []).length < 6) {
          return fetchTMDB(fallback, { language: 'en-US', page: 1 })
        }
        return d
      })
      .then(data => ({ ...data, results: withMediaType(mediaType, data.results) }))
  )
}

// Mixed (homepage) helpers — Movies + TV Series in one response
export const fetchMixedTrending = (page = 1) =>
  cachedFetch(`trending-mixed:${page}`, async () => {
    const [movies, tv] = await Promise.all([
      fetchTMDB(MEDIA_CONFIG.movie.trendingPath, { page }),
      fetchTMDB(MEDIA_CONFIG.tv.trendingPath, { page }),
    ])
    const movieResults = withMediaType('movie', movies.results ?? [])
    const tvResults    = withMediaType('tv', tv.results ?? [])
    return {
      results:       [...movieResults, ...tvResults],
      total_pages:   Math.max(movies.total_pages ?? 1, tv.total_pages ?? 1),
      total_results: (movies.total_results ?? 0) + (tv.total_results ?? 0),
    }
  })

export const fetchMixedSearch = (query, page = 1) =>
  cachedFetch(`search-mixed:${query}:${page}`, async () => {
    const [movies, tv] = await Promise.all([
      fetchTMDB(MEDIA_CONFIG.movie.searchPath, { query, page, include_adult: false, language: 'en-US' }),
      fetchTMDB(MEDIA_CONFIG.tv.searchPath,    { query, page, include_adult: false, language: 'en-US' }),
    ])
    const movieResults = withMediaType('movie', movies.results ?? [])
    const tvResults    = withMediaType('tv', tv.results ?? [])
    const combined     = rankSearchResults(query, [...movieResults, ...tvResults])
    return {
      results:       combined,
      total_pages:   Math.max(movies.total_pages ?? 1, tv.total_pages ?? 1),
      total_results: (movies.total_results ?? 0) + (tv.total_results ?? 0),
    }
  })

export const fetchFeatured = () =>
  cachedFetch('featured-mixed', async () => {
    const [movies, tv] = await Promise.all([
      fetchTMDB(MEDIA_CONFIG.movie.popularPath, { language: 'en-US', page: 1 }),
      fetchTMDB(MEDIA_CONFIG.tv.popularPath,    { language: 'en-US', page: 1 }),
    ])
    const combined = [
      ...withMediaType('movie', movies.results ?? []),
      ...withMediaType('tv', tv.results ?? []),
    ]
    return combined
      .filter(m => m.backdrop_path && m.overview && m.vote_average > 6)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 6)
  })

let _genreCache = null
// Combined movie + TV genre map (ids overlap only when names match)
export const getGenreMap = async () => {
  if (_genreCache) return _genreCache
  const [movieGenres, tvGenres] = await Promise.all([fetchGenres('movie'), fetchGenres('tv')])
  _genreCache = Object.fromEntries([...movieGenres, ...tvGenres].map(g => [g.id, g.name]))
  return _genreCache
}
