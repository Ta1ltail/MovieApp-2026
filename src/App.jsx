import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import ThemeToggle from './components/ThemeToggle'
import BackToTop from './components/BackToTop'
import HomePage from './pages/HomePage'
import MovieDetailsPage from './pages/MovieDetailsPage'

const PageTransitionWrapper = ({ children }) => {
  const location = useLocation()
  const ref = useRef(null)

  useEffect(() => {
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

const App = () => {
  return (
    <ThemeProvider>
      <PageTransitionWrapper>
        <Routes>
          <Route path="/"          element={<HomePage />} />
          <Route path="/movie/:id" element={<MovieDetailsPage />} />
        </Routes>
      </PageTransitionWrapper>
      <ThemeToggle />
      <BackToTop />
    </ThemeProvider>
  )
}

export default App