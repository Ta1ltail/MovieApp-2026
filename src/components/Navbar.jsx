import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import SearchSuggestions from './SearchSuggestions'
import { useAuth } from '../contexts/AuthContext'

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const UserIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/movies', label: 'Movies' },
  { to: '/tv', label: 'TV Series' },
]

const Navbar = () => {
  const { user, logout } = useAuth()
  const [searchOpen,      setSearchOpen]      = useState(false)
  const [navQuery,        setNavQuery]        = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [userMenuOpen,    setUserMenuOpen]    = useState(false)
  const inputRef = useRef(null)
  const wrapRef  = useRef(null)
  const userMenuRef = useRef(null)
  const location = useLocation()

  const openSearch = useCallback(() => {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setShowSuggestions(false)
    setNavQuery('')
  }, [])

  // When the user moves to another page while the search is open, close it
  // (guarded render-phase reset, matching the rest of the app).
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname)
    if (searchOpen) closeSearch()
    setUserMenuOpen(false)
  }

  // '/' global shortcut → focus the navbar search (available on every page)
  useEffect(() => {
    const onKey = (e) => {
      const tag     = document.activeElement?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
      if (isInput) return
      if (e.key === '/') {
        e.preventDefault()
        openSearch()
      }
      if (e.key === 'Escape') {
        if (searchOpen) {
          if (navQuery) setNavQuery('')
          else closeSearch()
          setShowSuggestions(false)
        }
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [searchOpen, navQuery, openSearch, closeSearch])

  // Clicking anywhere outside the search collapses it back to its default
  // pill (and hides suggestions / the user menu). Clicks inside the search
  // wrap — typing, suggestions, submitting a pick — are unaffected.
  useEffect(() => {
    const onOutside = (e) => {
      const insideSearch = wrapRef.current?.contains(e.target)
      if (!insideSearch) {
        if (searchOpen) closeSearch()
        else setShowSuggestions(false)
      }
      const insideUserMenu = userMenuRef.current?.contains(e.target)
      if (!insideUserMenu) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [searchOpen, closeSearch])

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

  const initial = (user?.name ?? 'U').trim().charAt(0).toUpperCase() || 'U'

  return (
    <nav
      className="navbar"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="navbar-inner">
        {/* Left cluster: brand + page links */}
        <div className="navbar-left">
          <Link to="/" className="navbar-brand" aria-label="BingeTime — home">
            <span className="navbar-logo-icon" aria-hidden="true">🎬</span>
            <span className="navbar-logo-text">
              Binge<span className="text-gradient">Time</span>
            </span>
          </Link>

          <div className="navbar-links">
            {NAV_LINKS.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `navbar-link${isActive ? ' navbar-link--active' : ''}`}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Right cluster: search + auth */}
        <div className="navbar-right">
          <span className="navbar-sep" aria-hidden="true" />

          <div className="navbar-search-wrap" ref={wrapRef}>
            {searchOpen ? (
              <>
                <div className="navbar-search-input-wrap navbar-search-input-wrap--wide">
                  <SearchIcon />
                  <input
                    ref={inputRef}
                    type="search"
                    className="navbar-search-input"
                    placeholder="Search movies & TV… (Esc to close)"
                    value={navQuery}
                    onChange={handleInputChange}
                    onFocus={() => navQuery.length >= 2 && setShowSuggestions(true)}
                    aria-label="Search movies and TV"
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

          {/* Auth — top right */}
          {user ? (
            <div className="navbar-user" ref={userMenuRef}>
              <button
                type="button"
                className="navbar-user-chip"
                onClick={() => setUserMenuOpen(o => !o)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                aria-label={`Account menu — signed in as ${user.name}`}
              >
                <span className="navbar-user-avatar" aria-hidden="true">{initial}</span>
                <span className="navbar-user-name">{user.name}</span>
              </button>
              {userMenuOpen && (
                <div className="navbar-user-menu" role="menu" aria-label="Account menu">
                  <p className="navbar-user-menu-email">{user.email}</p>
                  <p className="navbar-user-menu-demo">Prototype session</p>
                  <button
                    type="button"
                    className="navbar-user-menu-item"
                    role="menuitem"
                    onClick={() => { setUserMenuOpen(false); logout() }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="navbar-auth-btn"
              state={{ from: location.pathname + location.search }}
            >
              <UserIcon />
              <span className="navbar-auth-label">Log in</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
