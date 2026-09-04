import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchTMDB, getPosterUrl, mediaTitle, mediaYear, rankSearchResults } from '../lib/tmdb'
import { cachedFetch } from '../lib/cache'
import { slugify } from '../lib/utils'

// Searches both Movies and TV Series, ranks by relevance + popularity, and
// returns the top mixed hits.
const searchSuggestions = (query) => {
  const key = `suggest:${query}`
  return cachedFetch(key, async () => {
    const [movies, tv] = await Promise.all([
      cachedFetch(`suggest:movie:${query}`, () =>
        fetchTMDB('/search/movie', { query, page: 1, include_adult: false, language: 'en-US' })
          .then(d => (d.results ?? []).map(m => ({ ...m, media_type: 'movie' })))
      ),
      cachedFetch(`suggest:tv:${query}`, () =>
        fetchTMDB('/search/tv', { query, page: 1, include_adult: false, language: 'en-US' })
          .then(d => (d.results ?? []).map(t => ({ ...t, media_type: 'tv' })))
      ),
    ])
    return rankSearchResults(query, [...movies, ...tv]).slice(0, 8)
  })
}

/**
 * SearchSuggestions — dropdown shown when typing in the navbar search.
 *
 * Props:
 *  query       — current input value
 *  onSelect    — called when user picks a suggestion (closes dropdown)
 *  isVisible   — parent controls visibility
 *  onClose     — parent closes the dropdown
 */
const SearchSuggestions = ({ query, onSelect, isVisible, onClose }) => {
  const [results,   setResults]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [active,    setActive]    = useState(-1)
  const listRef = useRef(null)
  // The query the current results belong to, so a late response for an
  // outdated query is ignored instead of overwriting newer results.
  const latestQueryRef = useRef('')

  // Clear output as soon as the query changes (or becomes too short) — a
  // guarded render-phase update instead of a sync setState inside an effect.
  const [prevQuery, setPrevQuery] = useState(query)
  if (prevQuery !== query) {
    setPrevQuery(query)
    setResults([])
    setActive(-1)
    setLoading(false)
  }

  // Debounce + fetch
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) return
    latestQueryRef.current = q

    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await searchSuggestions(q)
        if (latestQueryRef.current !== q) return
        setResults(data)
        setActive(-1)
      } catch { /* ignore */ }
      finally {
        if (latestQueryRef.current === q) setLoading(false)
      }
    }, 250)

    return () => clearTimeout(t)
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!isVisible || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(a => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(a => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault()
      const m = results[active]
      if (m) onSelect?.(m)
    } else if (e.key === 'Escape') {
      onClose?.()
    }
  }, [isVisible, results, active, onSelect, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Scroll active item into view
  useEffect(() => {
    if (active >= 0 && listRef.current) {
      const el = listRef.current.children[active]
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [active])

  if (!isVisible || (!loading && results.length === 0)) return null

  return (
    <div
      className="search-suggestions"
      role="listbox"
      aria-label="Search suggestions"
      ref={listRef}
    >
      {loading && results.length === 0 && (
        <div className="search-suggestions-loading">
          <span className="search-suggestions-spinner" />
          Searching…
        </div>
      )}
      {results.map((item, i) => {
        const type    = item.media_type === 'tv' ? 'tv' : 'movie'
        const title   = mediaTitle(item)
        const year    = mediaYear(item) ?? ''
        const poster  = getPosterUrl(item.poster_path, 'w92')
        const isActive = i === active
        return (
          <Link
            key={`${type}-${item.id}`}
            to={`/${type}/${item.id}?title=${slugify(title)}`}
            className={`search-suggestion-item${isActive ? ' search-suggestion-item--active' : ''}`}
            role="option"
            aria-selected={isActive}
            onClick={() => onSelect?.(item)}
            onMouseEnter={() => setActive(i)}
          >
            <div className="search-suggestion-poster">
              {poster
                ? <img src={poster} alt="" width="36" height="54" loading="lazy" decoding="async" />
                : <span className="search-suggestion-poster-placeholder">🎬</span>
              }
            </div>
            <div className="search-suggestion-info">
              <span className="search-suggestion-title">{title}</span>
              {year && <span className="search-suggestion-year">{year}</span>}
            </div>
            <span className="search-suggestion-type">{type === 'tv' ? 'TV' : 'Movie'}</span>
            {item.vote_average > 0 && (
              <span className="search-suggestion-rating">
                ★ {item.vote_average.toFixed(1)}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export default SearchSuggestions
