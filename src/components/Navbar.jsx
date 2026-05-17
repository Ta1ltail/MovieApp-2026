import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import SearchSuggestions from './SearchSuggestions'

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const Navbar = () => {
  const [searchOpen,      setSearchOpen]      = useState(false)
  const [navQuery,        setNavQuery]        = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const wrapRef  = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome   = location.pathname === '/'

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setShowSuggestions(false)
    setNavQuery('')
  }, [])

  // '/' global shortcut → focus navbar search
  useEffect(() => {
    const onKey = (e) => {
      const tag     = document.activeElement?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (isInput) return
      if (e.key === '/') {
        e.preventDefault()
        if (!isHome) navigate('/')
        setTimeout(openSearch, isHome ? 0 : 150)
      }
      if (e.key === 'Escape' && searchOpen) {
        if (navQuery) setNavQuery('')
        else closeSearch()
        setShowSuggestions(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen, navQuery, isHome, navigate, openSearch, closeSearch])

  // Close suggestions on outside click
  useEffect(() => {
    const onOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const handleInputChange = (e) => {
    const val = e.target.value
    setNavQuery(val)
    setShowSuggestions(val.length >= 2)
  }

  const handleSuggestionSelect = useCallback(() => {
    setShowSuggestions(false)
    setNavQuery('')
    setSearchOpen(false)
  }, [])

  return (
    <nav
      className="navbar"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand" aria-label="MovieApp — home">
          <span className="navbar-logo-icon" aria-hidden="true">🎬</span>
          <span className="navbar-logo-text">
            Movie<span className="text-gradient">App</span>
          </span>
        </Link>

        <div className="navbar-right">
          {isHome && (
            /* Position relative here so the absolute suggestions are scoped to this wrapper */
            <div className="navbar-search-wrap" ref={wrapRef}>
              {searchOpen ? (
                <>
                  <div className="navbar-search-input-wrap navbar-search-input-wrap--wide">
                    <SearchIcon />
                    <input
                      ref={inputRef}
                      type="search"
                      className="navbar-search-input"
                      placeholder="Search movies… (Esc to close)"
                      value={navQuery}
                      onChange={handleInputChange}
                      onFocus={() => navQuery.length >= 2 && setShowSuggestions(true)}
                      aria-label="Search movies"
                      aria-autocomplete="list"
                      aria-expanded={showSuggestions}
                      autoComplete="off"
                    />
                    <button className="navbar-search-close" onClick={closeSearch} aria-label="Close search">✕</button>
                  </div>
                  <SearchSuggestions
                    query={navQuery}
                    isVisible={showSuggestions}
                    onSelect={handleSuggestionSelect}
                    onClose={() => setShowSuggestions(false)}
                  />
                </>
              ) : (
                <button
                  className="navbar-search-btn"
                  onClick={openSearch}
                  aria-label="Open search (press / to focus)"
                  title="Press / to search"
                >
                  <SearchIcon />
                  <span className="navbar-search-label">Search</span>
                  <kbd className="navbar-search-kbd" aria-hidden="true">/</kbd>
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