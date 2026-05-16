import { useState, useEffect, useCallback, useRef } from 'react'
import { useDebounce } from 'react-use'
import { fetchMovies, searchMovies, fetchGenres } from '../lib/tmdb'

// ── Default filter shape ───────────────────────────────────────────────────────
const DEFAULT_FILTERS = {
  genreId:   '',  // single genre ID string
  year:      '',  // 4-digit year string
  minRating: '',  // '6' | '7' | '8' | '9'
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
  const [error,        setError]        = useState('')

  // Prevent stale responses from clobbering newer ones
  const reqId = useRef(0)

  // ── Debounce search (250ms for snappier feel) ────────────────────────────────
  useDebounce(() => setDebouncedSearch(searchTerm.trim()), 250, [searchTerm])

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
        // Search mode — TMDB /search/movie is title/keyword based
        data = await searchMovies(debouncedSearch, page)
      } else {
        // Browse mode — all filters via /discover/movie
        const filters = {
          genreIds:  appliedFilters.genreId  ? [appliedFilters.genreId] : [],
          year:      appliedFilters.year      || '',
          minRating: appliedFilters.minRating || '',
        }
        data = await fetchMovies(category, filters, page)
      }

      if (id !== reqId.current) return // discard stale response

      setMovies(data.results ?? [])
      setTotalPages(Math.min(data.total_pages ?? 1, 500)) // TMDB hard cap
      setTotalResults(data.total_results ?? 0)
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

  // ── Apply: commit draft → applied ────────────────────────────────────────────
  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters })
  }, [draftFilters])

  // ── Remove a single applied filter (chip × button) ───────────────────────────
  const removeAppliedFilter = useCallback((key) => {
    setDraftFilters(prev => ({ ...prev, [key]: '' }))
    setAppliedFilters(prev => ({ ...prev, [key]: '' }))
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
  ].filter(Boolean).length

  const hasDraftChanges =
    draftFilters.genreId   !== appliedFilters.genreId   ||
    draftFilters.year      !== appliedFilters.year      ||
    draftFilters.minRating !== appliedFilters.minRating

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
    // data
    movies, totalPages, totalResults,
    isLoading, error,
    reload: load,
  }
}