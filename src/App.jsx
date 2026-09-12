import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import ThemeToggle from './components/ThemeToggle'
import BackToTop from './components/BackToTop'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

// Code-split each route so visitors only download the page they open.
const HomePage          = lazy(() => import('./pages/HomePage'))
const BrowsePage        = lazy(() => import('./pages/BrowsePage'))
const MediaDetailsPage  = lazy(() => import('./pages/MediaDetailsPage'))
const LoginPage         = lazy(() => import('./pages/LoginPage'))

const RouteFallback = () => (
  <div className="route-fallback" role="status" aria-label="Loading page">
    <svg className="route-fallback-spinner" viewBox="0 0 50 50" fill="none" aria-hidden="true">
      <circle cx="25" cy="25" r="20" stroke="currentColor" strokeOpacity="0.15" strokeWidth="4" />
      <path d="M25 5 A20 20 0 0 1 45 25" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </div>
)

const PageTransitionWrapper = ({ children }) => {
  const location = useLocation()
  const ref = useRef(null)

  useEffect(() => {
    // New route → start at the top of the page.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    if (ref.current) {
      ref.current.classList.remove('page-enter')
      void ref.current.offsetWidth
      ref.current.classList.add('page-enter')
    }
  }, [location.pathname])

  return (
    <div ref={ref} className="page-transition">
      {children}
    </div>
  )
}

const ApiBanner = ({ visible }) => {
  if (!visible) return null
  return (
    <div className="api-banner" role="alert">
      <p><strong>TMDB API key missing or invalid.</strong> Add <code>VITE_TMDB_API_KEY</code> to your <code>.env</code> file and restart the dev server.</p>
    </div>
  )
}

const AppInner = () => {
  const { shortcutsOpen, closeShortcuts } = useKeyboardShortcuts()
  const [apiKeyValid, setApiKeyValid] = useState(() => {
    const key = import.meta.env.VITE_TMDB_API_KEY
    return !key || key.trim().length < 10 ? false : null // null = unchecked, false = invalid, true = valid
  })

  useEffect(() => {
    const key = import.meta.env.VITE_TMDB_API_KEY
    if (!key || key.trim().length < 10) return
    // Probe the API with a cheap endpoint — only runs when key looks valid
    fetch('https://api.themoviedb.org/3/configuration', {
      headers: { Authorization: `Bearer ${key}` }
    })
      .then(res => { setApiKeyValid(res.ok ? true : false) })
      .catch(() => setApiKeyValid(false))
  }, [])

  return (
    <>
      <ApiBanner visible={apiKeyValid === false} />
      <PageTransitionWrapper>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/"          element={<HomePage />} />
            <Route path="/movies"    element={<BrowsePage mediaType="movie" />} />
            <Route path="/tv"        element={<BrowsePage mediaType="tv" />} />
            <Route path="/movie/:id" element={<MediaDetailsPage mediaType="movie" />} />
            <Route path="/tv/:id"    element={<MediaDetailsPage mediaType="tv" />} />
            <Route path="/login"     element={<LoginPage />} />
            {/* Unknown paths fall back to the home feed. */}
            <Route path="*"          element={<HomePage />} />
          </Routes>
        </Suspense>
      </PageTransitionWrapper>
      <ThemeToggle />
      <BackToTop />
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={closeShortcuts} />
      {/* Vercel Web Analytics — loads only in production; renders nothing in dev. */}
      <Analytics />
    </>
  )
}

const App = () => (
  <ThemeProvider>
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  </ThemeProvider>
)

export default App
