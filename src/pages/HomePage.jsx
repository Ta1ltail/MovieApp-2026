import { useEffect, useRef } from 'react'
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
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="homepage-search-icon">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const HomePage = () => {
  const genres = useGenres()
  const searchInputRef = useRef(null)

  const {
    searchTerm, setSearchTerm, clearSearch,
    category, setCategory,
    page, setPage,
    draftFilters, updateDraftFilter,
    appliedFilters, removeAppliedFilter,
    applyFilters, resetFilters,
    activeFilterCount, hasDraftChanges,
    movies, totalPages, totalResults,
    isLoading, error, reload,
  } = useMovies()

  const isSearching = searchTerm.trim().length > 0

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  const handleClearAll = () => {
    clearSearch()
    resetFilters()
  }

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      <main className="homepage" id="main-content">
        {/* Hero carousel — hidden during active search */}
        {!isSearching && <FeaturedCarousel />}

        {/* ── Large homepage search bar (below carousel) ── */}
        <div className="homepage-search-section">
          <div className="homepage-search-inner">
            <div className="homepage-search-bar" role="search">
              <SearchIcon />
              <input
                ref={searchInputRef}
                type="search"
                className="homepage-search-input"
                placeholder="Search for movies, genres, titles…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                aria-label="Search movies"
                autoComplete="off"
              />
              {isSearching && (
                <>
                  {!isLoading && totalResults > 0 && (
                    <span className="homepage-search-count">
                      {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    className="homepage-search-clear"
                    onClick={handleClearAll}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search results header (shown when searching) */}
        {isSearching && (
          <div className="search-results-header">
            <div className="search-results-inner">
              <h2 className="search-results-title">
                Results for "<em>{searchTerm}</em>"
              </h2>
              <button className="search-results-clear" onClick={handleClearAll}>
                ← Back to browse
              </button>
            </div>
          </div>
        )}

        <div className="homepage-body">
          <FilterBar
            category={category}
            setCategory={setCategory}
            draftFilters={draftFilters}
            updateDraftFilter={updateDraftFilter}
            appliedFilters={appliedFilters}
            removeAppliedFilter={removeAppliedFilter}
            applyFilters={applyFilters}
            resetFilters={resetFilters}
            activeFilterCount={activeFilterCount}
            hasDraftChanges={hasDraftChanges}
            genres={genres}
            totalResults={totalResults}
            isLoading={isLoading}
            isSearching={isSearching}
          />

          <section aria-label="Movies list" className="movies-section">
            {/* Loading skeleton */}
            {isLoading && <SkeletonGrid count={20} />}

            {/* Error */}
            {!isLoading && error && (
              <ErrorState message={error} onRetry={reload} />
            )}

            {/* Empty state */}
            {!isLoading && !error && movies.length === 0 && (
              <EmptyState searchTerm={searchTerm} onClear={handleClearAll} />
            )}

            {/* Grid */}
            {!isLoading && !error && movies.length > 0 && (
              <ul className="movies-grid" aria-label="Movie cards">
                {movies.map((movie) => (
                  <li key={movie.id}>
                    <MovieCard movie={movie} />
                  </li>
                ))}
              </ul>
            )}

            {/* Pagination */}
            {!isLoading && movies.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            )}
          </section>
        </div>
      </main>

      <Footer />
    </>
  )
}

export default HomePage