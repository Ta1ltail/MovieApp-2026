import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { fetchTMDB, getPosterUrl } from '../lib/tmdb'
import { cachedFetch } from '../lib/cache'

const slugify = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? ''

const searchSuggestions = (query) => {
  const key = `suggest:${query}`
  return cachedFetch(key, () =>
    fetchTMDB('/search/movie', { query, page: 1, include_adult: false, language: 'en-US' })
      .then(d => (d.results ?? []).slice(0, 6))
  )
}

/**
 * SearchSuggestions — dropdown shown when typing in a search field.
 *
 * Props:
 *  query       — current input value (already debounced externally or debounced here)
 *  onSelect    — called when user picks a suggestion (closes dropdown)
 *  inputRef    — ref to the input so we can check focus
 *  isVisible   — parent controls visibility
 *  onClose     — parent closes the dropdown
 */
const SearchSuggestions = ({ query, onSelect, isVisible, onClose }) => {
  const [results,   setResults]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [active,    setActive]    = useState(-1)
  const listRef = useRef(null)
  const abortRef = useRef(null)

  // Debounce + fetch
  useEffect(() => {
    if (!query || query.trim().length < 2) { setResults([]); return }

    const t = setTimeout(async () => {
      abortRef.current?.abort()
      setLoading(true)
      try {
        const data = await searchSuggestions(query.trim())
        setResults(data)
        setActive(-1)
      } catch { /* ignore */ }
      finally { setLoading(false) }
    }, 250)

    return () => { clearTimeout(t); abortRef.current?.abort() }
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
      {results.map((movie, i) => {
        const year   = movie.release_date?.split('-')[0] ?? ''
        const poster = getPosterUrl(movie.poster_path, 'w92')
        const isActive = i === active
        return (
          <Link
            key={movie.id}
            to={`/movie/${movie.id}?title=${slugify(movie.title)}`}
            className={`search-suggestion-item${isActive ? ' search-suggestion-item--active' : ''}`}
            role="option"
            aria-selected={isActive}
            onClick={() => onSelect?.(movie)}
            onMouseEnter={() => setActive(i)}
          >
            <div className="search-suggestion-poster">
              {poster
                ? <img src={poster} alt="" width="36" height="54" loading="lazy" decoding="async" />
                : <span className="search-suggestion-poster-placeholder">🎬</span>
              }
            </div>
            <div className="search-suggestion-info">
              <span className="search-suggestion-title">{movie.title}</span>
              {year && <span className="search-suggestion-year">{year}</span>}
            </div>
            {movie.vote_average > 0 && (
              <span className="search-suggestion-rating">
                ★ {movie.vote_average.toFixed(1)}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}

export default SearchSuggestions