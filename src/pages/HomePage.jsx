import { useState, useRef, useEffect, useCallback } from 'react'
import Navbar from '../components/Navbar'
import FeaturedCarousel from '../components/FeaturedCarousel'
import FilterBar from '../components/FilterBar'
import MovieCard from '../components/MovieCard'
import Pagination from '../components/Pagination'
import Footer from '../components/Footer'
import { SkeletonGrid } from '../components/Spinner'
import { EmptyState, ErrorState } from '../components/States'
import { useMovies, useGenres } from '../hooks/useMovies'

const SearchIcon = () => (
  <svg className="homepage-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const HomePage = () => {
  const {
    searchTerm, setSearchTerm, clearSearch,
    category, setCategory,
    page, setPage,
    draftFilters, updateDraftFilter, toggleDraftGenre,
    appliedFilters, removeAppliedFilter, removeAppliedGenre,
    applyFilters, resetFilters,
    activeFilterCount, hasDraftChanges,
    movies, totalPages, totalResults,
    isLoading, error, reload,
  } = useMovies()

  const genres      = useGenres()
  const isSearching = Boolean(searchTerm.trim())

  // Local input mirrors URL search term
  const [inputVal, setInputVal] = useState(searchTerm)
  const inputRef = useRef(null)

  useEffect(() => { setInputVal(searchTerm) }, [searchTerm])

  const handleInputChange = useCallback((e) => {
    const val = e.target.value
    setInputVal(val)
    setSearchTerm(val)
  }, [setSearchTerm])

  const handleClear = useCallback(() => {
    setInputVal('')
    clearSearch()
    inputRef.current?.focus()
  }, [clearSearch])

  const handleClearAll = useCallback(() => {
    if (isSearching) clearSearch()
    else resetFilters()
  }, [isSearching, clearSearch, resetFilters])

  return (
    <div className="homepage">
      <Navbar />
      <FeaturedCarousel />

      {/* Search bar — always visible below the carousel */}
      <div className="homepage-search-section" role="search" aria-label="Homepage search">
        <div className="homepage-search-inner">
          <div className="homepage-search-bar">
            <SearchIcon />
            <input
              ref={inputRef}
              type="search"
              className="homepage-search-input"
              placeholder="Search for movies, genres, titles…"
              value={inputVal}
              onChange={handleInputChange}
              aria-label="Search movies"
              autoComplete="off"
            />
            {inputVal && (
              <button className="homepage-search-clear" onClick={handleClear} aria-label="Clear search">✕</button>
            )}
            {isSearching && totalResults > 0 && (
              <span className="homepage-search-count" aria-live="polite">
                {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search results header */}
      {isSearching && (
        <div className="search-results-header">
          <div className="search-results-inner">
            <h2 className="search-results-title">
              Results for <em>"{searchTerm}"</em>
            </h2>
            {totalResults > 0 && (
              <p className="search-results-count">
                {totalResults.toLocaleString()} movie{totalResults !== 1 ? 's' : ''} found
              </p>
            )}
            <button className="search-results-clear" onClick={handleClear}>← Back to browsing</button>
          </div>
        </div>
      )}

      <div className="homepage-body">
        <FilterBar
          category={category}             setCategory={setCategory}
          draftFilters={draftFilters}     updateDraftFilter={updateDraftFilter}
          toggleDraftGenre={toggleDraftGenre}
          appliedFilters={appliedFilters}
          removeAppliedFilter={removeAppliedFilter}
          removeAppliedGenre={removeAppliedGenre}
          applyFilters={applyFilters}     resetFilters={resetFilters}
          activeFilterCount={activeFilterCount}
          hasDraftChanges={hasDraftChanges}
          genres={genres}
          isSearching={isSearching}
        />

        <section className="movies-section" aria-label="Movie results">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : isLoading ? (
            <SkeletonGrid count={20} />
          ) : movies.length === 0 ? (
            <EmptyState searchTerm={searchTerm} onClear={handleClearAll} />
          ) : (
            <ul className="movies-grid" aria-label="Movies list">
              {movies.map(movie => (
                <li key={movie.id}><MovieCard movie={movie} /></li>
              ))}
            </ul>
          )}
        </section>

        {!isLoading && !error && movies.length > 0 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      <Footer />
    </div>
  )
}

export default HomePage