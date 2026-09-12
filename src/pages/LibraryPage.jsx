import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import PersonalRows from '../components/PersonalRows'
import MediaCard from '../components/MediaCard'
import { useUserData } from '../contexts/UserDataContext'
import { usePageTitle } from '../hooks/usePageTitle'

/**
 * LibraryGrid — one responsive poster grid (the same movies-grid the rest of
 * the app uses, so every card is identical in size and spacing) wrapped in
 * an aligned empty state when the list has nothing in it yet.
 */
const LibraryGrid = ({ heading, items, emptyText, cta }) => (
  <section className="library-section" aria-label={heading}>
    <h2 className="similar-heading">{heading}</h2>
    {items.length === 0 ? (
      <div className="library-empty" role="status">
        <span className="library-empty-icon" aria-hidden="true">🎬</span>
        <p className="library-empty-text">{emptyText}</p>
        {cta && (
          <Link to={cta.to} className="library-empty-btn">{cta.label}</Link>
        )}
      </div>
    ) : (
      <ul className="movies-grid library-grid" aria-label={`${heading} list`}>
        {items.map(m => (
          <li key={`${m.media_type}-${m.id}`}>
            <MediaCard media={m} />
          </li>
        ))}
      </ul>
    )}
  </section>
)

/**
 * LibraryListGrid — My List / Favorites / Liked as fixed poster grids.
 * (PersonalRows still renders the horizontal Continue Watching /
 * Recently Watched cards above.)
 */
const LibraryListGrid = () => {
  const { listRows, dbError } = useUserData()

  // listRows carry stored title/poster; MediaCard expects a TMDB-ish shape.
  const toCard = (r) => ({
    id: r.tmdb_id,
    media_type: r.media_type,
    title: r.title || undefined,
    name: r.media_type === 'tv' ? (r.title || undefined) : undefined,
    poster_path: r.poster_path ?? null,
    vote_average: null,
    // MediaCard reads per-type title/date keys via mediaTitle/mediaYear —
    // missing fields simply render as "N/A".
  })

  const byType = (t) => listRows.filter(r => r.list_type === t).map(toCard)
  const myList = byType('mylist')
  const favorites = byType('favorite')
  const liked = byType('like')

  if (dbError) return null

  return (
    <>
      <LibraryGrid
        heading="My List"
        items={myList}
        emptyText="Movies and TV shows you want to watch later will appear here. Use the ＋ My List button on any title."
        cta={{ to: '/movies', label: 'Browse movies' }}
      />
      <LibraryGrid
        heading="Favorites"
        items={favorites}
        emptyText="Mark the titles you love with the ♥ Favorite button and they'll be saved here."
        cta={{ to: '/', label: 'Find something to love' }}
      />
      <LibraryGrid
        heading="Liked"
        items={liked}
        emptyText="Titles you've 👍 liked are collected here."
        cta={{ to: '/tv', label: 'Browse TV series' }}
      />
    </>
  )
}

/**
 * LibraryPage (/library) — the authenticated user's personal section.
 * Continue Watching + Recently Watched rows, then My List / Favorites /
 * Liked as poster grids. Guests are redirected to /login (state.from
 * preserves the return path).
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
        <LibraryListGrid />
      </div>
      <Footer />
    </div>
  )
}

export default LibraryPage
