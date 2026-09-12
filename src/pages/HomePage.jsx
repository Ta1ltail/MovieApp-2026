import { useEffect, useRef } from 'react'
import Navbar from '../components/Navbar'
import FeaturedCarousel from '../components/FeaturedCarousel'
import MediaCard from '../components/MediaCard'
import Pagination from '../components/Pagination'
import Footer from '../components/Footer'
import SearchHeader from '../components/SearchHeader'
import { SkeletonGrid } from '../components/Spinner'
import { EmptyState, ErrorState } from '../components/States'
import { useMixedFeed } from '../hooks/useMixedFeed'
import { usePageTitle } from '../hooks/usePageTitle'

const HomePage = () => {
  const {
    searchTerm, setSearchTerm, clearSearch, hasSearch,
    items, totalPages, totalResults,
    page, setPage,
    isLoading, error, reload,
  } = useMixedFeed()

  usePageTitle(
    hasSearch && searchTerm.trim()
      ? `Search: ${searchTerm.trim()}`
      : 'Movies & TV Series'
  )

  // Pagination: land on the top of the content listing — right below the
  // search bar — not at the absolute top (which would jump back to the hero).
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
    <div className="homepage">
      <Navbar />
      <FeaturedCarousel />

      <SearchHeader
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        onClear={clearSearch}
        placeholder="Search movies, TV series, genres, titles…"
      />

      <div className="homepage-body" ref={listingRef}>
        <section className="movies-section" aria-label={hasSearch ? 'Search results' : 'Trending now'}>
          {hasSearch && totalResults > 0 && (
            <p className="search-results-count">
              {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''} found
            </p>
          )}

          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : isLoading ? (
            <SkeletonGrid count={20} />
          ) : items.length === 0 ? (
            <EmptyState
              searchTerm={searchTerm}
              onClear={clearSearch}
              heading={hasSearch ? 'No results found' : 'Nothing trending right now'}
            />
          ) : (
            <ul className="movies-grid" aria-label={hasSearch ? 'Search results list' : 'Trending movies and TV series'}>
              {items.map(media => (
                <li key={`${media.media_type}-${media.id}`}>
                  <MediaCard media={media} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {!isLoading && !error && items.length > 0 && (
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </div>

      <Footer />
    </div>
  )
}

export default HomePage
