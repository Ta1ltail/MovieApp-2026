import { useRef, useCallback } from 'react'

const SearchIcon = () => (
  <svg className="homepage-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

/**
 * SearchHeader — the search input + "Results for …" header shared by the
 * Home, Movies and TV Series pages.
 */
const SearchHeader = ({
  searchTerm,
  onSearchTermChange,
  onClear,
  placeholder = 'Search movies, genres, titles…',
}) => {
  const inputRef = useRef(null)
  const isSearching = Boolean(searchTerm.trim())

  const handleChange = useCallback((e) => onSearchTermChange(e.target.value), [onSearchTermChange])

  const handleClear = useCallback(() => {
    onClear?.()
    inputRef.current?.focus()
  }, [onClear])

  return (
    <>
      <div className="homepage-search-section" role="search" aria-label="Search">
        <div className="homepage-search-inner">
          <div className="homepage-search-bar">
            <SearchIcon />
            <input
              ref={inputRef}
              type="search"
              className="homepage-search-input"
              placeholder={placeholder}
              value={searchTerm}
              onChange={handleChange}
              aria-label="Search"
              autoComplete="off"
            />
            {searchTerm && (
              <button className="homepage-search-clear" onClick={handleClear} aria-label="Clear search">✕</button>
            )}
          </div>
        </div>
      </div>

      {isSearching && (
        <div className="search-results-header">
          <div className="search-results-inner">
            <h2 className="search-results-title">
              Results for <em>"{searchTerm}"</em>
            </h2>
            <button className="search-results-clear" onClick={onClear}>← Back to browsing</button>
          </div>
        </div>
      )}
    </>
  )
}

export default SearchHeader
