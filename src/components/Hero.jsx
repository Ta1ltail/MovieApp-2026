const Hero = ({ searchTerm, setSearchTerm, clearSearch, totalResults, isSearching }) => {
  return (
    <header className="hero">
      <div className="hero-bg" aria-hidden="true" />

      <div className="hero-content">
        <p className="hero-eyebrow">Discover · Watch · Explore</p>
        <h1 className="hero-title">
          Find <span className="text-gradient">Movies</span> You'll{' '}
          <span className="text-gradient">Love</span>
        </h1>
        <p className="hero-subtitle">
          Browse thousands of films — trending, top-rated, and beyond.
        </p>

        {/* Search bar */}
        <div className="hero-search" role="search">
          <div className="hero-search-inner">
            <svg className="hero-search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search movies, genres, directors…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="hero-search-input"
              aria-label="Search movies"
              autoComplete="off"
            />
            {searchTerm && (
              <button
                className="hero-search-clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {isSearching && totalResults > 0 && (
            <p className="hero-search-count" aria-live="polite">
              {totalResults.toLocaleString()} result{totalResults !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>
    </header>
  )
}

export default Hero