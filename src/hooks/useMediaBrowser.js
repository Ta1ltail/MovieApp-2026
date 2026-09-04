import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchDiscover, fetchSearch, fetchGenres, CATEGORIES } from '../lib/tmdb'
import { useDebounce } from './useDebounce'

export const useGenres = (mediaType) => {
  const [genres, setGenres] = useState([])
  useEffect(() => {
    let cancelled = false
    fetchGenres(mediaType).then(g => { if (!cancelled) setGenres(g) }).catch(console.error)
    return () => { cancelled = true }
  }, [mediaType])
  return genres
}

/**
 * useMediaBrowser — the URL-as-state browsing machine for a single media type.
 *
 * URL state semantics shared by the Movies and TV Series pages:
 *   ?q= ?cat= ?page= ?genre= ?year= ?rating=
 * The movie categories/floors/discover params are unchanged; 'tv' uses the
 * TV endpoint equivalents.
 */
export const useMediaBrowser = (mediaType) => {
  const [searchParams, setSearchParams] = useSearchParams()

  const searchTerm = searchParams.get('q') ?? ''
  const category   = searchParams.get('cat') ?? 'all'
  const page       = parseInt(searchParams.get('page') ?? '1', 10)

  // ── Store page the user was on BEFORE they started searching ──────────────
  const preSearchPageRef = useRef(1)

  const appliedFilters = useMemo(() => {
    const genreParam = searchParams.get('genre') ?? ''
    const genreIds   = genreParam ? genreParam.split(',').filter(Boolean) : []
    return {
      genreIds,
      year:      searchParams.get('year')   ?? '',
      minRating: searchParams.get('rating') ?? '',
    }
  }, [searchParams])

  const [draftFilters, setDraftFilters] = useState({
    genreIds:  appliedFilters.genreIds,
    year:      appliedFilters.year,
    minRating: appliedFilters.minRating,
  })

  const prevApplied = useRef(appliedFilters)
  useEffect(() => {
    const a = appliedFilters
    const p = prevApplied.current
    const sameGenres = JSON.stringify(a.genreIds) === JSON.stringify(p.genreIds)
    if (!sameGenres || a.year !== p.year || a.minRating !== p.minRating) {
      setDraftFilters({ genreIds: a.genreIds, year: a.year, minRating: a.minRating })
      prevApplied.current = a
    }
  }, [appliedFilters])

  const [movies,       setMovies]       = useState([])
  const [totalPages,   setTotalPages]   = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState('')

  const debouncedSearch = useDebounce(searchTerm, 350)

  // Manual "retry" trigger — bumping it refetches with the current params.
  const [reloadCount, setReloadCount] = useState(0)
  const reload = useCallback(() => setReloadCount(c => c + 1), [])

  // Everything that should trigger a fetch, serialized.
  const requestKey = useMemo(
    () => `${mediaType}::${debouncedSearch}::${page}::${category}::${JSON.stringify(appliedFilters)}::${reloadCount}`,
    [mediaType, debouncedSearch, page, category, appliedFilters, reloadCount]
  )

  // When the request inputs change, flip back to the loading state right away.
  // Guarded render-phase update (avoids a synchronous setState inside an effect).
  const [prevRequestKey, setPrevRequestKey] = useState(requestKey)
  if (requestKey !== prevRequestKey) {
    setPrevRequestKey(requestKey)
    setIsLoading(true)
    setError('')
  }

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        let data
        if (debouncedSearch.trim()) {
          data = await fetchSearch(mediaType, debouncedSearch.trim(), page)
        } else {
          data = await fetchDiscover(mediaType, category, appliedFilters, page)
        }
        if (controller.signal.aborted) return
        setMovies(data.results ?? [])
        setTotalPages(Math.min(data.total_pages ?? 1, 500))
        setTotalResults(data.total_results ?? 0)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err?.message ?? 'Failed to fetch.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [mediaType, debouncedSearch, page, category, appliedFilters, reloadCount])

  // ── Setters ───────────────────────────────────────────────────────────────

  const setSearchTerm = useCallback((val) => {
    setSearchParams(prev => {
      const next          = new URLSearchParams(prev)
      const currentSearch = prev.get('q') ?? ''

      if (!val || !val.trim()) {
        // Clearing search → restore pre-search page
        next.delete('q')
        next.delete('page')
        if (preSearchPageRef.current > 1) {
          next.set('page', String(preSearchPageRef.current))
        }
      } else {
        // Starting a fresh search → save current page first
        if (!currentSearch.trim()) {
          preSearchPageRef.current = parseInt(prev.get('page') ?? '1', 10)
        }
        next.set('q', val)
        next.delete('page') // always start search results at page 1
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const clearSearch = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('q')
      next.delete('page')
      // Restore the page the user was on before searching
      if (preSearchPageRef.current > 1) {
        next.set('page', String(preSearchPageRef.current))
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setCategory = useCallback((cat) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (cat === 'all') next.delete('cat')
      else next.set('cat', cat)
      next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setPage = useCallback((p) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (p <= 1) next.delete('page')
      else next.set('page', String(p))
      return next
    })
  }, [setSearchParams])

  const toggleDraftGenre = useCallback((genreId) => {
    setDraftFilters(prev => {
      const id  = String(genreId)
      const has = prev.genreIds.includes(id)
      return { ...prev, genreIds: has ? prev.genreIds.filter(g => g !== id) : [...prev.genreIds, id] }
    })
  }, [])

  const updateDraftFilter = useCallback((key, value) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const applyFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (draftFilters.genreIds.length) next.set('genre', draftFilters.genreIds.join(','))
      else next.delete('genre')
      if (draftFilters.year)      next.set('year',   draftFilters.year)
      else next.delete('year')
      if (draftFilters.minRating) next.set('rating', draftFilters.minRating)
      else next.delete('rating')
      next.delete('page')
      return next
    }, { replace: true })
  }, [draftFilters, setSearchParams])

  const removeAppliedFilter = useCallback((key) => {
    const paramMap = { genreIds: 'genre', year: 'year', minRating: 'rating' }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete(paramMap[key] ?? key)
      next.delete('page')
      return next
    }, { replace: true })
    setDraftFilters(prev => ({ ...prev, [key]: key === 'genreIds' ? [] : '' }))
  }, [setSearchParams])

  const removeAppliedGenre = useCallback((genreId) => {
    setSearchParams(prev => {
      const next    = new URLSearchParams(prev)
      const current = (next.get('genre') ?? '').split(',').filter(Boolean)
      const updated = current.filter(g => g !== String(genreId))
      if (updated.length) next.set('genre', updated.join(','))
      else next.delete('genre')
      next.delete('page')
      return next
    }, { replace: true })
    setDraftFilters(prev => ({
      ...prev,
      genreIds: prev.genreIds.filter(g => g !== String(genreId)),
    }))
  }, [setSearchParams])

  const resetFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('genre')
      next.delete('year')
      next.delete('rating')
      next.delete('page')
      return next
    }, { replace: true })
    setDraftFilters({ genreIds: [], year: '', minRating: '' })
  }, [setSearchParams])

  const hasDraftChanges = useMemo(() =>
    JSON.stringify(draftFilters.genreIds) !== JSON.stringify(appliedFilters.genreIds) ||
    draftFilters.year      !== appliedFilters.year      ||
    draftFilters.minRating !== appliedFilters.minRating
  , [draftFilters, appliedFilters])

  return {
    mediaType,
    categories: CATEGORIES[mediaType],
    searchTerm, setSearchTerm, clearSearch,
    category, setCategory,
    page, setPage,
    draftFilters, updateDraftFilter, toggleDraftGenre,
    appliedFilters, removeAppliedFilter, removeAppliedGenre,
    applyFilters, resetFilters,
    hasDraftChanges,
    movies, totalPages, totalResults,
    isLoading, error, reload,
  }
}
