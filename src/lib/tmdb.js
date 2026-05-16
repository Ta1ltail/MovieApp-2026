const BASE_URL = 'https://api.themoviedb.org/3'
export const IMAGE_BASE = 'https://image.tmdb.org/t/p'

// ── Auth ──────────────────────────────────────────────────────────────────────
const getHeaders = () => ({
  accept: 'application/json',
  Authorization: `Bearer ${import.meta.env.VITE_TMDB_API_KEY}`,
})

// ── Core fetch ────────────────────────────────────────────────────────────────
export const fetchTMDB = async (path, params = {}) => {
  const url = new URL(`${BASE_URL}${path}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v))
    }
  })
  const res = await fetch(url.toString(), { method: 'GET', headers: getHeaders() })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`TMDB ${res.status}: ${text || 'Request failed'}`)
  }
  return res.json()
}

// ── Image helpers ─────────────────────────────────────────────────────────────
export const getPosterUrl   = (path, size = 'w342')     => path ? `${IMAGE_BASE}/${size}${path}` : null
export const getBackdropUrl = (path, size = 'original') => path ? `${IMAGE_BASE}/${size}${path}` : null

// ── Category definitions ──────────────────────────────────────────────────────
export const CATEGORIES = [
  {
    id:          'all',
    label:       'All Movies',
    description: 'Browse the full catalog',
    sortBy:      'popularity.desc',
    extraParams: {},
  },
  {
    id:          'popular',
    label:       'Popular',
    description: 'Most popular right now',
    sortBy:      'popularity.desc',
    extraParams: { 'vote_count.gte': 50 },
  },
  {
    id:          'most_viewed',
    label:       'Most Viewed',
    description: 'Widely watched (sorted by vote count)',
    sortBy:      'vote_count.desc',
    extraParams: { 'vote_count.gte': 1000 },
  },
  {
    id:          'top_rated',
    label:       'Top Rated',
    description: 'Highest rated films',
    sortBy:      'vote_average.desc',
    extraParams: { 'vote_count.gte': 300 },
  },
  {
    id:          'latest',
    label:       'Latest',
    description: 'Newest releases',
    sortBy:      'primary_release_date.desc',
    extraParams: {
      'vote_count.gte':           5,
      'primary_release_date.lte': new Date().toISOString().split('T')[0],
    },
  },
]

// ── Discover params builder ───────────────────────────────────────────────────
export const buildDiscoverParams = (categoryId, filters = {}, page = 1) => {
  const cat = CATEGORIES.find(c => c.id === categoryId) ?? CATEGORIES[0]

  const params = {
    page,
    include_adult: false,
    language:      'en-US',
    sort_by:       cat.sortBy,
    ...cat.extraParams,
  }

  if (filters.genreIds?.length) {
    params.with_genres = filters.genreIds.join(',')
  }

  if (filters.year) {
    params.primary_release_year = filters.year
  }

  if (filters.minRating) {
    const existing = parseFloat(params['vote_average.gte'] ?? 0)
    params['vote_average.gte'] = Math.max(existing, parseFloat(filters.minRating))
    if (!params['vote_count.gte']) params['vote_count.gte'] = 50
  }

  return params
}

// ── API calls ─────────────────────────────────────────────────────────────────
export const fetchMovies = (categoryId, filters, page) =>
  fetchTMDB('/discover/movie', buildDiscoverParams(categoryId, filters, page))

/**
 * searchMovies — keyword search via /search/movie.
 * TMDB's search endpoint is title/keyword based. For best relevance we also
 * request adult=false and the current language.
 */
export const searchMovies = (query, page = 1) =>
  fetchTMDB('/search/movie', {
    query,
    page,
    include_adult: false,
    language: 'en-US',
  })

export const fetchGenres = () =>
  fetchTMDB('/genre/movie/list', { language: 'en-US' }).then(d => d.genres ?? [])

export const fetchMovieDetails = (id) =>
  fetchTMDB(`/movie/${id}`, { append_to_response: 'credits', language: 'en-US' })

/** Fetch 6 featured movies for the hero carousel */
export const fetchFeaturedMovies = async () => {
  const data = await fetchTMDB('/movie/popular', {
    language: 'en-US',
    page: 1,
  })
  // Filter to movies with backdrops and overviews, take first 6
  return (data.results ?? [])
    .filter(m => m.backdrop_path && m.overview && m.vote_average > 6)
    .slice(0, 6)
}

/** Fetch genre list once — used in carousel to resolve genre_ids → names */
let _genreCache = null
export const getGenreMap = async () => {
  if (_genreCache) return _genreCache
  const genres = await fetchGenres()
  _genreCache = Object.fromEntries(genres.map(g => [g.id, g.name]))
  return _genreCache
}