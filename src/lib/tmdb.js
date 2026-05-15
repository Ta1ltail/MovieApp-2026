/**
 * lib/tmdb.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all TMDB API communication.
 *
 * KEY DESIGN DECISION:
 * All category + filter combinations funnel through /discover/movie — the only
 * TMDB endpoint that accepts every filter param simultaneously.
 * Categories are expressed as sort_by strategies + optional constraint params,
 * NOT as different endpoints. This is what makes ALL filters compose correctly.
 *
 * "Most Viewed" note:
 * TMDB has no view/play-count data. Best honest proxy: sort by vote_count.desc
 * with a vote_count floor (≥1000). High vote count strongly correlates with
 * actual watch volume since casual viewers don't rate movies they haven't seen.
 */

const BASE_URL    = 'https://api.themoviedb.org/3'
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
export const getPosterUrl   = (path, size = 'w342')      => path ? `${IMAGE_BASE}/${size}${path}` : null
export const getBackdropUrl = (path, size = 'original')  => path ? `${IMAGE_BASE}/${size}${path}` : null
export const getProfileUrl  = (path, size = 'w185')      => path ? `${IMAGE_BASE}/${size}${path}` : null

// ── Category definitions ──────────────────────────────────────────────────────
// Each category maps to a /discover/movie sort strategy + optional constraints.
// There is NO separate endpoint per category — this keeps all filters composable.
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

// ── Unified discover params builder ──────────────────────────────────────────
/**
 * buildDiscoverParams(categoryId, filters, page)
 *
 * Merges category sort strategy + all secondary filters into one flat object
 * for /discover/movie. Every filter simply appends keys — nothing overwrites
 * anything else. This is the function that makes stacked filters work correctly.
 *
 * @param {string}  categoryId  - one of CATEGORIES[].id
 * @param {object}  filters     - { genreIds[], year, minRating, castId }
 * @param {number}  page
 * @returns {object} flat params object ready for fetchTMDB
 */
export const buildDiscoverParams = (categoryId, filters = {}, page = 1) => {
  const cat = CATEGORIES.find(c => c.id === categoryId) ?? CATEGORIES[0]

  const params = {
    page,
    include_adult: false,
    language:      'en-US',
    sort_by:       cat.sortBy,
    ...cat.extraParams,
  }

  // Genre: comma-separated IDs → TMDB AND logic (movie must have ALL genres)
  if (filters.genreIds?.length) {
    params.with_genres = filters.genreIds.join(',')
  }

  // Year: exact primary release year
  if (filters.year) {
    params.primary_release_year = filters.year
  }

  // Min rating: take the higher of category floor and user choice
  if (filters.minRating) {
    const existing = parseFloat(params['vote_average.gte'] ?? 0)
    params['vote_average.gte'] = Math.max(existing, parseFloat(filters.minRating))
    // Ensure a minimum vote count so ratings are meaningful
    if (!params['vote_count.gte']) params['vote_count.gte'] = 50
  }

  // Cast: TMDB person ID resolved via /search/person
  if (filters.castId) {
    params.with_cast = filters.castId
  }

  return params
}

// ── API calls ─────────────────────────────────────────────────────────────────
export const fetchMovies       = (categoryId, filters, page) =>
  fetchTMDB('/discover/movie', buildDiscoverParams(categoryId, filters, page))

export const searchMovies      = (query, page = 1) =>
  fetchTMDB('/search/movie',  { query, page, include_adult: false, language: 'en-US' })

export const searchPerson      = (query) =>
  fetchTMDB('/search/person', { query, include_adult: false, language: 'en-US', page: 1 })

export const fetchGenres       = () =>
  fetchTMDB('/genre/movie/list', { language: 'en-US' }).then(d => d.genres ?? [])

export const fetchMovieDetails = (id) =>
  fetchTMDB(`/movie/${id}`, { append_to_response: 'credits', language: 'en-US' })