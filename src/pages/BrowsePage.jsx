import { useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import FilterBar from '../components/FilterBar'
import MediaCard from '../components/MediaCard'
import Pagination from '../components/Pagination'
import Footer from '../components/Footer'
import SearchHeader from '../components/SearchHeader'
import { SkeletonGrid } from '../components/Spinner'
import { EmptyState, ErrorState } from '../components/States'
import { useMediaBrowser, useGenres } from '../hooks/useMediaBrowser'

const PAGE_LABEL = {
  movie: { noun: 'movie',  placeholder: 'Search movies, genres, titles…' },
  tv:    { noun: 'show',   placeholder: 'Search TV series, genres, titles…' },
}

/**
 * BrowsePage — the dedicated listing page for one media type (Movies or TV).
 * No hero: content starts with search + category/filter browsing, plus
 * pagination. Changing pages scrolls back to the top of the listing.
 */
const BrowsePage = ({ mediaType }) => {
  const {
    searchTerm, setSearchTerm, clearSearch,
    category, setCategory,
    page, setPage,
    draftFilters, updateDraftFilter, toggleDraftGenre,
    appliedFilters, removeAppliedFilter, removeAppliedGenre,
    applyFilters, resetFilters,
    hasDraftChanges, categories,
    movies, totalPages, totalResults,
    isLoading, error, reload,
  } = useMediaBrowser(mediaType)

  const genres = useGenres(mediaType)
  const isSearching = Boolean(searchTerm.trim())
  const label = PAGE_LABEL[mediaType]

  // Pagination: any page change returns the user to the top of the listing —
  // just below the search bar (same behavior on the Home page).
  const listingRef = useRef(null)
  const prevPageRef = useRef(page)
  useEffect(() => {
    const changed = prevPageRef.current !== page
    prevPageRef.current = page
    // After a page change, or when arriving deep-linked/refreshed on a page
    // > 1, land on the top of the listing (below the search bar).
    if (changed || page > 1) {
      requestAnimationFrame(() => listingRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }))
    }
  }, [page])

  return (
    <div className="browse-page">
      <Navbar />

      <SearchHeader
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onClear={clearSearch}
        placeholder={label.placeholder}
      />

      <div className="homepage-body" ref={listingRef}>
        {!isSearching && (
          <FilterBar
            categories={categories}
            category={category}             setCategory={setCategory}
            draftFilters={draftFilters}     updateDraftFilter={updateDraftFilter}
            toggleDraftGenre={toggleDraftGenre}
            appliedFilters={appliedFilters}
            removeAppliedFilter={removeAppliedFilter}
            removeAppliedGenre={removeAppliedGenre}
            applyFilters={applyFilters}     resetFilters={resetFilters}
            hasDraftChanges={hasDraftChanges}
            genres={genres}
          />
        )}

        <section className="movies-section" aria-label={`${label.noun === 'movie' ? 'Movie' : 'TV Series'} results`}>
          {isSearching && totalResults > 0 && (
            <p className="search-results-count">
              {totalResults.toLocaleString()} {label.noun}{totalResults !== 1 ? 's' : ''} found
            </p>
          )}
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : isLoading ? (
            <SkeletonGrid count={20} />
          ) : movies.length === 0 ? (
            <EmptyState
              searchTerm={searchTerm}
              onClear={clearSearch}
              heading={`No ${mediaType === 'tv' ? 'TV shows' : 'movies'} found`}
            />
          ) : (
            <ul className="movies-grid" aria-label={`${label.noun} list`}>
              {movies.map(media => (
                <li key={`${media.media_type ?? mediaType}-${media.id}`}>
                  <MediaCard media={media} mediaType={mediaType} />
                </li>
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

export default BrowsePage
