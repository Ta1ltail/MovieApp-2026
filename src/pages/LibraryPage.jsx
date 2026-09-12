import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PersonalRows from '../components/PersonalRows'
import { useUserData } from '../contexts/UserDataContext'
import { usePageTitle } from '../hooks/usePageTitle'

/**
 * LibraryPage (/library) — the authenticated user's personal section.
 * Reuses the PersonalRows sections. Guests are redirected to /login
 * (state.from preserves the return path).
 */
const LibraryPage = () => {
  usePageTitle('My Library')
  const { user, authReady } = useUserData()
  const [greeting] = useState(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })

  if (!authReady) {
    return (
      <div className="details-page">
        <Navbar />
        <div className="details-loading" role="status" aria-label="Loading library" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: '/library' }} replace />
  }

  return (
    <div className="library-page">
      <Navbar />
      <div className="library-inner">
        <header className="library-header">
          <h1>{greeting}</h1>
          <p className="library-sub">Your continue watching, recent activity, lists and favorites.</p>
        </header>
        <PersonalRows />
      </div>
      <Footer />
    </div>
  )
}

export default LibraryPage
