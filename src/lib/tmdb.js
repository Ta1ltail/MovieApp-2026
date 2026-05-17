import { cachedFetch } from './cache'

const BASE_URL   = 'https://api.themoviedb.org/3'
export const IMAGE_BASE = 'https://image.tmdb.org/t/p'

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

export const CATEGORIES = [
  { id: 'all',         label: 'All Movies',   sortBy: 'popularity.desc',          extraParams: {} },
  { id: 'popular',     label: 'Popular',      sortBy: 'popularity.desc',          extraParams: { 'vote_count.gte': 50 } },
  { id: 'most_viewed', label: 'Most Viewed',  sortBy: 'vote_count.desc',          extraParams: { 'vote_count.gte': 1000 } },
  { id: 'top_rated',   label: 'Top Rated',    sortBy: 'vote_average.desc',        extraParams: { 'vote_count.gte': 300 } },
  {
    id: 'latest', label: 'Latest', sortBy: 'primary_release_date.desc',
    extraParams: { 'vote_count.gte': 5, 'primary_release_date.lte': new Date().toISOString().split('T')[0] },
  },
]

// Decade → date range mapping
const DECADE_RANGES = {
  '2020s': { gte: '2020-01-01', lte: `${new Date().getFullYear()}-12-31` },
  '2010s': { gte: '2010-01-01', lte: '2019-12-31' },
  '2000s': { gte: '2000-01-01', lte: '2009-12-31' },
  '1990s': { gte: '1990-01-01', lte: '1999-12-31' },
}

export const buildDiscoverParams = (categoryId, filters = {}, page = 1) => {
  const cat    = CATEGORIES.find(c => c.id === categoryId) ?? CATEGORIES[0]
  const params = { page, include_adult: false, language: 'en-US', sort_by: cat.sortBy, ...cat.extraParams }

  // Multi-genre support
  if (filters.genreIds?.length) params.with_genres = filters.genreIds.join(',')

  // Year: single year or decade range
  if (filters.year) {
    const range = DECADE_RANGES[filters.year]
    if (range) {
      params['primary_release_date.gte'] = range.gte
      params['primary_release_date.lte'] = range.lte
    } else {
      params.primary_release_year = filters.year
    }
  }

  if (filters.minRating) {
    const existing = parseFloat(params['vote_average.gte'] ?? 0)
    params['vote_average.gte'] = Math.max(existing, parseFloat(filters.minRating))
    if (!params['vote_count.gte']) params['vote_count.gte'] = 50
  }

  return params
}

export const fetchMovies = (categoryId, filters, page) => {
  const params = buildDiscoverParams(categoryId, filters, page)
  const key    = `discover:${JSON.stringify(params)}`
  return cachedFetch(key, () => fetchTMDB('/discover/movie', params))
}

export const searchMovies = (query, page = 1) => {
  const key = `search:${query}:${page}`
  return cachedFetch(key, () => fetchTMDB('/search/movie', { query, page, include_adult: false, language: 'en-US' }))
}

export const fetchGenres = () =>
  cachedFetch('genres', () =>
    fetchTMDB('/genre/movie/list', { language: 'en-US' }).then(d => d.genres ?? [])
  )

export const fetchMovieDetails = (id) =>
  cachedFetch(`movie:${id}`, () =>
    fetchTMDB(`/movie/${id}`, { append_to_response: 'credits', language: 'en-US' })
  )

export const fetchSimilarMovies = (id) =>
  cachedFetch(`similar:${id}`, () =>
    fetchTMDB(`/movie/${id}/recommendations`, { language: 'en-US', page: 1 })
      .then(d => {
        if ((d.results ?? []).length < 6) {
          return fetchTMDB(`/movie/${id}/similar`, { language: 'en-US', page: 1 })
        }
        return d
      })
  )

export const fetchFeaturedMovies = () =>
  cachedFetch('featured', async () => {
    const data = await fetchTMDB('/movie/popular', { language: 'en-US', page: 1 })
    return (data.results ?? [])
      .filter(m => m.backdrop_path && m.overview && m.vote_average > 6)
      .slice(0, 6)
  })

let _genreCache = null
export const getGenreMap = async () => {
  if (_genreCache) return _genreCache
  const genres = await fetchGenres()
  _genreCache  = Object.fromEntries(genres.map(g => [g.id, g.name]))
  return _genreCache
}