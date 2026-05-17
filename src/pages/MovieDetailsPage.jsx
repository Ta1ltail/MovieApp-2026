import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchMovieDetails, getPosterUrl, getBackdropUrl } from '../lib/tmdb'
import Navbar from '../components/Navbar'
import VideoPlayer from '../components/VideoPlayer'
import SimilarMovies from '../components/SimilarMovies'
import LazyImage from '../components/LazyImage'
import Footer from '../components/Footer'

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#f5c518" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const MovieDetailsPage = () => {
  const { id }   = useParams()
  const navigate = useNavigate()
  const [movie,      setMovie]      = useState(null)
  const [isLoading,  setIsLoading]  = useState(true)
  const [error,      setError]      = useState('')
  const [showPlayer, setShowPlayer] = useState(false)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError('')
    setShowPlayer(false)
    fetchMovieDetails(id)
      .then(data => { if (!cancelled) { setMovie(data); setIsLoading(false) } })
      .catch(err  => { if (!cancelled) { setError(err.message); setIsLoading(false) } })
    return () => { cancelled = true }
  }, [id])

  if (isLoading) {
    return (
      <div className="details-page">
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <svg width="48" height="48" viewBox="0 0 50 50" fill="none" style={{ animation: 'spin 0.9s linear infinite' }} aria-label="Loading">
            <circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <path d="M25 5 A20 20 0 0 1 45 25" stroke="#AB8BFF" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="details-page">
        <Navbar />
        <div className="error-state" style={{ minHeight: '60vh' }}>
          <div className="error-state-icon">⚠️</div>
          <h2 className="error-state-title">Failed to load movie</h2>
          <p className="error-state-text">{error}</p>
          <button className="error-state-btn" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    )
  }

  const posterUrl   = getPosterUrl(movie.poster_path, 'w500')        ?? '/no-movie.svg'
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'original')
  const year        = movie.release_date?.split('-')[0] ?? 'N/A'
  const rating      = movie.vote_average?.toFixed(1)   ?? 'N/A'
  const runtime     = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : null

  return (
    <div className="details-page">
      <Navbar />

      {backdropUrl && (
        <div className="details-backdrop">
          <img src={backdropUrl} alt="" className="details-backdrop-img" loading="eager" decoding="async" />
          <div className="details-backdrop-overlay" aria-hidden="true" />
          <button
            className="details-back-btn details-back-btn--absolute"
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <BackIcon /> Back
          </button>
        </div>
      )}

      <div className="details-content-wrapper">
        <div className="details-main">
          <div className="details-poster-wrap">
            <LazyImage src={posterUrl} alt={`${movie.title} poster`} className="details-poster" />
          </div>

          <div className="details-info">
            <h1 className="details-title">{movie.title}</h1>
            {movie.tagline && <p className="details-tagline">"{movie.tagline}"</p>}

            <div className="details-meta">
              <span className="details-rating">
                <StarIcon />
                <span style={{ marginLeft: 4 }}>{rating}</span>
              </span>
              <span className="details-dot" aria-hidden="true">·</span>
              <span>{year}</span>
              {runtime && (
                <>
                  <span className="details-dot" aria-hidden="true">·</span>
                  <span>{runtime}</span>
                </>
              )}
            </div>

            {movie.genres?.length > 0 && (
              <div className="details-genres">
                {movie.genres.map(g => (
                  <span key={g.id} className="details-genre-pill">{g.name}</span>
                ))}
              </div>
            )}

            {movie.overview && <p className="details-overview">{movie.overview}</p>}

            <button
              className="details-watch-btn"
              onClick={() => setShowPlayer(true)}
              aria-label={`Watch ${movie.title}`}
            >
              ▶ Watch Now
            </button>
          </div>
        </div>

        {/* Video player — shortcuts bar is now inside VideoPlayer */}
        {showPlayer && (
          <div className="details-player-section">
            <h2 className="details-player-heading">Now Playing</h2>
            <VideoPlayer tmdbId={movie.id} title={movie.title} />
          </div>
        )}

        <SimilarMovies movieId={id} />
      </div>

      <Footer />
    </div>
  )
}

export default MovieDetailsPage