import { useEffect } from 'react'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import FilterBar from '../components/FilterBar'
import MovieCard from '../components/MovieCard'
import Pagination from '../components/Pagination'
import { SkeletonGrid } from '../components/Spinner'
import { EmptyState, ErrorState } from '../components/States'
import { useMovies, useGenres } from '../hooks/useMovies'

const HomePage = () => {
  const genres = useGenres()

  const {
    // search
    searchTerm, setSearchTerm, clearSearch,
    // navigation
    category, setCategory,
    page, setPage,
    // filters
    draftFilters, updateDraftFilter,
    appliedFilters, removeAppliedFilter,
    applyFilters, resetFilters,
    activeFilterCount, hasDraftChanges,
    castLoading,
    // data
    movies, totalPages, totalResults,
    isLoading, error, reload,
  } = useMovies()

  const isSearching = searchTerm.trim().length > 0

  // Smooth scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page])

  // Clear search + filters together
  const handleClearAll = () => {
    clearSearch()
    resetFilters()
  }

  return (
    <>
      <Navbar />

      <main className="homepage" id="main-content">
        {/* Background pattern */}
        <div className="pattern" aria-hidden="true" />

        {/* Hero + Search */}
        <Hero
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          clearSearch={clearSearch}
          totalResults={totalResults}
          isSearching={isSearching}
        />

        <div className="homepage-body">
          {/* Category tabs + Filter panel */}
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
            castLoading={castLoading}
            genres={genres}
            totalResults={totalResults}
            isLoading={isLoading}
            isSearching={isSearching}
          />

          {/* Movies section */}
          <section aria-label="Movies list" className="movies-section">
            {isSearching && (
              <h2 className="movies-section-heading">
                Search results for "<em>{searchTerm}</em>"
              </h2>
            )}

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

      <a href="#main-content" className="skip-link">Skip to content</a>
    </>
  )
}

export default HomePage