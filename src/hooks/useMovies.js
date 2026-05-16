import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDebounce } from 'react-use'
import { fetchMovies, searchMovies, fetchGenres } from '../lib/tmdb'

const DEFAULT_FILTERS = { genreId: '', year: '', minRating: '' }

export const useGenres = () => {
  const [genres, setGenres] = useState([])
  useEffect(() => { fetchGenres().then(setGenres).catch(console.error) }, [])
  return genres
}

export const useMovies = () => {
  const [params, setParams] = useSearchParams()

  // Read from URL or fallback to defaults
  const category    = params.get('category') || 'all'
  const page        = parseInt(params.get('page') || '1', 10)
  const genreId     = params.get('genre')  || ''
  const year        = params.get('year')   || ''
  const minRating   = params.get('rating') || ''

  const [searchTerm,      setSearchTerm]      = useState(params.get('q') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm.trim())

  const [draftFilters,   setDraftFilters]   = useState({ genreId, year, minRating })
  const [appliedFilters, setAppliedFilters] = useState({ genreId, year, minRating })

  const [movies,       setMovies]       = useState([])
  const [totalPages,   setTotalPages]   = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading,    setIsLoading]    = useState(false)
  const [error,        setError]        = useState('')

  const reqId = useRef(0)

  useDebounce(() => setDebouncedSearch(searchTerm.trim()), 250, [searchTerm])

  // Sync search term to URL
  useEffect(() => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (debouncedSearch) next.set('q', debouncedSearch); else next.delete('q')
      next.delete('page')
      return next
    }, { replace: true })
  }, [debouncedSearch]) 

  // Sync category/page/filters to URL
  const setCategory = useCallback((cat) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (cat === 'all') next.delete('category'); else next.set('category', cat)
      next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])

  const setPage = useCallback((p) => {
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (p === 1) next.delete('page'); else next.set('page', String(p))
      return next
    }, { replace: true })
  }, [setParams])

  const updateDraftFilter = useCallback((key, value) => {
    setDraftFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const applyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters })
    setParams(prev => {
      const next = new URLSearchParams(prev)
      if (draftFilters.genreId) next.set('genre', draftFilters.genreId); else next.delete('genre')
      if (draftFilters.year)    next.set('year',  draftFilters.year);    else next.delete('year')
      if (draftFilters.minRating) next.set('rating', draftFilters.minRating); else next.delete('rating')
      next.delete('page')
      return next
    }, { replace: true })
  }, [draftFilters, setParams])

  const removeAppliedFilter = useCallback((key) => {
    const paramMap = { genreId: 'genre', year: 'year', minRating: 'rating' }
    setDraftFilters(prev => ({ ...prev, [key]: '' }))
    setAppliedFilters(prev => ({ ...prev, [key]: '' }))
    setParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete(paramMap[key])
      next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])

  const resetFilters = useCallback(() => {
    setDraftFilters({ ...DEFAULT_FILTERS })
    setAppliedFilters({ ...DEFAULT_FILTERS })
    setParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('genre'); next.delete('year'); next.delete('rating'); next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])

  const clearSearch = useCallback(() => {
    setSearchTerm('')
    setParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('q'); next.delete('page')
      return next
    }, { replace: true })
  }, [setParams])

  const load = useCallback(async () => {
    const id = ++reqId.current
    setIsLoading(true)
    setError('')
    try {
      let data
      if (debouncedSearch) {
        data = await searchMovies(debouncedSearch, page)
      } else {
        data = await fetchMovies(category, {
          genreIds:  appliedFilters.genreId  ? [appliedFilters.genreId] : [],
          year:      appliedFilters.year      || '',
          minRating: appliedFilters.minRating || '',
        }, page)
      }
      if (id !== reqId.current) return
      setMovies(data.results ?? [])
      setTotalPages(Math.min(data.total_pages ?? 1, 500))
      setTotalResults(data.total_results ?? 0)
    } catch (err) {
      if (id !== reqId.current) return
      setError('Failed to load movies. Please try again.')
      setMovies([])
    } finally {
      if (id === reqId.current) setIsLoading(false)
    }
  }, [debouncedSearch, category, page, appliedFilters])

  useEffect(() => { load() }, [load])

  const activeFilterCount = [appliedFilters.genreId, appliedFilters.year, appliedFilters.minRating].filter(Boolean).length
  const hasDraftChanges =
    draftFilters.genreId !== appliedFilters.genreId ||
    draftFilters.year    !== appliedFilters.year    ||
    draftFilters.minRating !== appliedFilters.minRating

  return {
    searchTerm, setSearchTerm, clearSearch,
    category, setCategory,
    page, setPage,
    draftFilters, updateDraftFilter,
    appliedFilters, removeAppliedFilter,
    applyFilters, resetFilters,
    activeFilterCount, hasDraftChanges,
    movies, totalPages, totalResults,
    isLoading, error,
    reload: load,
  }
}