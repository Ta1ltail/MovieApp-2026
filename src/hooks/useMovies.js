/**
 * hooks/useMovies.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Two-layer filter architecture:
 *   draftFilters   → what the user is editing in the panel (not yet committed)
 *   appliedFilters → committed values that actually drive API calls
 *
 * Filters are only sent to TMDB on explicit "Apply Filters" — preventing
 * redundant requests on every keystroke while keeping UX responsive.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounce } from 'react-use'
import { fetchMovies, searchMovies, fetchGenres, searchPerson } from '../lib/tmdb'

// ── Default filter shape ───────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  genreId:   '',   // single genre ID string
  year:      '',   // 4-digit year string
  minRating: '',   // '6' | '7' | '8' | '9'
  castQuery: '',   // human-readable actor name
  castId:    null, // resolved TMDB person ID (null = not resolved yet)
}

// ── useGenres ─────────────────────────────────────────────────────────────────
export const useGenres = () => {
  const [genres, setGenres] = useState([])
  useEffect(() => {
    fetchGenres().then(setGenres).catch(console.error)
  }, [])
  return genres
}

// ── useMovies ─────────────────────────────────────────────────────────────────
export const useMovies = () => {
  // ── Search ──────────────────────────────────────────────────────────────────
  const [searchTerm,      setSearchTerm]      = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [category, setCategory] = useState('all')
  const [page,     setPage]     = useState(1)

  // ── Two-layer filters ───────────────────────────────────────────────────────
  const [draftFilters,   setDraftFilters]   = useState({ ...DEFAULT_FILTERS })
  const [appliedFilters, setAppliedFilters] = useState({ ...DEFAULT_FILTERS })

  // ── Async state ─────────────────────────────────────────────────────────────
  const [movies,       setMovies]       = useState([])
  const [totalPages,   setTotalPages]   = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading,    setIsLoading]    = useState(false)
  const [castLoading,  setCastLoading]  = useState(false)
  const [error,        setError]        = useState('')

  // Prevents stale responses from clobbering newer ones
  const reqId = useRef(0)

  // ── Debounce search ─────────────────────────────────────────────────────────
  useDebounce(() => setDebouncedSearch(searchTerm.trim()), 400, [searchTerm])

  // ── Reset to page 1 when navigation or committed filters change ─────────────
  useEffect(() => { setPage(1) }, [debouncedSearch, category, appliedFilters])

  // ── Main fetch ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    const id = ++reqId.current
    setIsLoading(true)
    setError('')

    try {
      let data

      if (debouncedSearch) {
        // Search mode — TMDB /search/movie doesn't accept discover filters,
        // so we pass only the query + page.
        data = await searchMovies(debouncedSearch, page)
      } else {
        // Browse mode — ALL filters go through /discover/movie together.
        const filters = {
          genreIds:  appliedFilters.genreId  ? [appliedFilters.genreId]  : [],
          year:      appliedFilters.year      || '',
          minRating: appliedFilters.minRating || '',
          castId:    appliedFilters.castId    || null,
        }
        data = await fetchMovies(category, filters, page)
      }

      if (id !== reqId.current) return // discard stale response

      setMovies(data.results       || [])
      setTotalPages(Math.min(data.total_pages   || 1, 500)) // TMDB hard cap
      setTotalResults(data.total_results || 0)
    } catch (err) {
      if (id !== reqId.current) return
      console.error('[useMovies] fetch error:', err)
      setError('Failed to load movies. Please try again.')
      setMovies([])
    } finally {
      if (id === reqId.current) setIsLoading(false)
    }
  }, [debouncedSearch, category, page, appliedFilters])

  useEffect(() => { load() }, [load])

  // ── Draft filter helpers ────────────────────────────────────────────────────
  const updateDraftFilter = useCallback((key, value) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // ── Apply: resolve cast name → TMDB person ID if changed, then commit ───────
  const applyFilters = useCallback(async () => {
    let castId = appliedFilters.castId

    // Only re-resolve if the cast query actually changed
    const castChanged = draftFilters.castQuery !== appliedFilters.castQuery
    if (castChanged) {
      if (draftFilters.castQuery.trim()) {
        setCastLoading(true)
        try {
          const res = await searchPerson(draftFilters.castQuery.trim())
          castId = res.results?.[0]?.id ?? null
        } catch {
          castId = null
        } finally {
          setCastLoading(false)
        }
      } else {
        castId = null
      }
    }

    setAppliedFilters({
      genreId:   draftFilters.genreId,
      year:      draftFilters.year,
      minRating: draftFilters.minRating,
      castQuery: draftFilters.castQuery,
      castId,
    })
  }, [draftFilters, appliedFilters])

  // ── Remove a single applied filter (for chip × buttons) ─────────────────────
  const removeAppliedFilter = useCallback((key) => {
    const value    = ''
    const castClear = key === 'castQuery' ? { castId: null } : {}
    setDraftFilters(prev => ({ ...prev, [key]: value }))
    setAppliedFilters(prev => ({ ...prev, [key]: value, ...castClear }))
  }, [])

  // ── Reset: clear everything ─────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setDraftFilters({ ...DEFAULT_FILTERS })
    setAppliedFilters({ ...DEFAULT_FILTERS })
  }, [])

  const clearSearch = useCallback(() => setSearchTerm(''), [])

  const handleSetCategory = useCallback((cat) => {
    setCategory(cat)
    setPage(1)
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────────
  const activeFilterCount = [
    appliedFilters.genreId,
    appliedFilters.year,
    appliedFilters.minRating,
    appliedFilters.castQuery,
  ].filter(Boolean).length

  const hasDraftChanges =
    draftFilters.genreId   !== appliedFilters.genreId   ||
    draftFilters.year      !== appliedFilters.year      ||
    draftFilters.minRating !== appliedFilters.minRating ||
    draftFilters.castQuery !== appliedFilters.castQuery

  return {
    // search
    searchTerm, setSearchTerm, clearSearch,
    // navigation
    category, setCategory: handleSetCategory,
    page, setPage,
    // filters
    draftFilters,   updateDraftFilter,
    appliedFilters, removeAppliedFilter,
    applyFilters,   resetFilters,
    activeFilterCount, hasDraftChanges,
    castLoading,
    // data
    movies, totalPages, totalResults,
    isLoading, error,
    reload: load,
  }
}