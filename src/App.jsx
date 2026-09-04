import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider } from './contexts/AuthContext'
import ThemeToggle from './components/ThemeToggle'
import BackToTop from './components/BackToTop'
import HomePage from './pages/HomePage'
import BrowsePage from './pages/BrowsePage'
import MediaDetailsPage from './pages/MediaDetailsPage'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

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

const AppInner = () => {
  const { shortcutsOpen, closeShortcuts } = useKeyboardShortcuts()

  return (
    <>
      <PageTransitionWrapper>
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/movies"    element={<BrowsePage mediaType="movie" />} />
          <Route path="/tv"        element={<BrowsePage mediaType="tv" />} />
          <Route path="/movie/:id" element={<MediaDetailsPage mediaType="movie" />} />
          <Route path="/tv/:id"    element={<MediaDetailsPage mediaType="tv" />} />
        </Routes>
      </PageTransitionWrapper>
      <ThemeToggle />
      <BackToTop />
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={closeShortcuts} />
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
