import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const Navbar = ({ searchTerm, setSearchTerm }) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const inputRef = useRef(null)
  const location = useLocation()
  const isHome = location.pathname === '/'

  useEffect(() => {
    if (searchOpen && inputRef.current) inputRef.current.focus()
  }, [searchOpen])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
        setSearchTerm?.('')
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen, setSearchTerm])

  useEffect(() => {
    if (searchTerm && searchTerm.length > 0) setSearchOpen(true)
  }, [searchTerm])

  return (
    /* CHANGED: removed "sticky top-0 z-200" — navbar now scrolls with page */
    <nav className="navbar navbar--relative" role="navigation" aria-label="Main navigation">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="MovieApp — home">
          <span className="navbar-logo-icon" aria-hidden="true">🎬</span>
          <span className="navbar-logo-text">
            Movie<span className="text-gradient">App</span>
          </span>
        </Link>

        <div className="navbar-right">
          {isHome && (
            <div className="navbar-search-wrap">
              {searchOpen ? (
                <div className="navbar-search-input-wrap">
                  <SearchIcon />
                  <input
                    ref={inputRef}
                    type="search"
                    className="navbar-search-input"
                    placeholder="Search movies…"
                    value={searchTerm ?? ''}
                    onChange={e => setSearchTerm?.(e.target.value)}
                    aria-label="Search movies"
                    autoComplete="off"
                  />
                  <button
                    className="navbar-search-close"
                    onClick={() => { setSearchOpen(false); setSearchTerm?.('') }}
                    aria-label="Close search"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  className="navbar-search-btn"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Open search"
                >
                  <SearchIcon />
                  <span className="navbar-search-label">Search</span>
                </button>
              )}
            </div>
          )}

          <div className="navbar-links">
            <Link to="/" className="navbar-link">Home</Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar