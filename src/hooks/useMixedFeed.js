import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchMixedTrending, fetchMixedSearch } from '../lib/tmdb'
import { useDebounce } from './useDebounce'

/**
 * useMixedFeed — homepage feed that mixes Movies and TV Series.
 *
 * Browsing mode shows combined trending content; typing a query switches to
 * combined search results. Both are paginated from the same ?page param so
 * back/forward/refresh behave like the dedicated browse pages.
 */
export const useMixedFeed = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const searchTerm = searchParams.get('q') ?? ''
  const page       = parseInt(searchParams.get('page') ?? '1', 10)
  const debouncedSearch = useDebounce(searchTerm, 350)
  const isSearching = Boolean(debouncedSearch.trim())

  const [items,        setItems]        = useState([])
  const [totalPages,   setTotalPages]   = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [isLoading,    setIsLoading]    = useState(true)
  const [error,        setError]        = useState('')

  const [reloadCount, setReloadCount] = useState(0)
  const reload = useCallback(() => setReloadCount(c => c + 1), [])

  const requestKey = `${debouncedSearch}::${page}::${reloadCount}`

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
        const data = isSearching
          ? await fetchMixedSearch(debouncedSearch.trim(), page)
          : await fetchMixedTrending(page)
        if (controller.signal.aborted) return
        setItems(data.results ?? [])
        setTotalPages(Math.min(data.total_pages ?? 1, 500))
        setTotalResults(data.total_results ?? 0)
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err?.message ?? 'Failed to load.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [isSearching, debouncedSearch, page, reloadCount])

  // ── URL setters (same semantics as the browse pages) ─────────────────────

  const preSearchPageRef = useRef(1)

  const setSearchTerm = useCallback((val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      const currentSearch = prev.get('q') ?? ''
      if (!val || !val.trim()) {
        next.delete('q')
        next.delete('page')
        if (preSearchPageRef.current > 1) next.set('page', String(preSearchPageRef.current))
      } else {
        if (!currentSearch.trim()) preSearchPageRef.current = parseInt(prev.get('page') ?? '1', 10)
        next.set('q', val)
        next.delete('page')
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const clearSearch = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('q')
      next.delete('page')
      if (preSearchPageRef.current > 1) next.set('page', String(preSearchPageRef.current))
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

  const hasSearch = Boolean(searchTerm.trim())

  return {
    searchTerm, setSearchTerm, clearSearch, hasSearch,
    items, totalPages, totalResults,
    page, setPage,
    isLoading, error, reload,
  }
}
