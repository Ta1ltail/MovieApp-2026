import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Spinner from '../components/Spinner'
import VideoPlayer from '../components/VideoPlayer'
import SimilarMovies from '../components/SimilarMovies'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import LazyImage from '../components/LazyImage'
import { fetchMovieDetails, getPosterUrl, getBackdropUrl } from '../lib/tmdb'

const StarIcon = () => (
  <img src="/star.svg" alt="" aria-hidden="true" className="details-star" />
)

const MovieDetailsPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [movie,     setMovie]     = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState('')
  const playerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await fetchMovieDetails(id)
        if (!cancelled) {
          setMovie(data)
          document.title = `${data.title} — MovieApp`
        }
      } catch {
        if (!cancelled) setError('Failed to load movie details.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()

    window.scrollTo({ top: 0, behavior: 'instant' })
    return () => {
      cancelled = true
      document.title = 'MovieApp'
    }
  }, [id])

  const scrollToPlayer = () =>
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
          <Spinner size={48} />
        </div>
        <Footer />
      </>
    )
  }

  if (error || !movie) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg-primary)' }}>
          <p style={{ color: '#f87171', fontSize: '1.1rem' }}>{error || 'Movie not found'}</p>
          <button onClick={() => navigate('/')} className="details-back-btn">← Back to Home</button>
        </div>
        <Footer />
      </>
    )
  }

  const backdropUrl = getBackdropUrl(movie.backdrop_path)
  const posterUrl   = getPosterUrl(movie.poster_path, 'w500') ?? '/no-movie.svg'
  const releaseYear = movie.release_date?.split('-')[0] ?? 'N/A'
  const runtime     = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A'
  const rating      = movie.vote_average?.toFixed(1) ?? 'N/A'

  return (
    <div className="details-page">
      <Navbar />

      <div className="details-backdrop">
        {backdropUrl && (
          <LazyImage src={backdropUrl} alt="" className="details-backdrop-img" />
        )}
        <div className="details-backdrop-overlay" />
        <button
          onClick={() => navigate('/')}
          className="details-back-btn details-back-btn--absolute"
          aria-label="Back to home"
        >
          ← Back
        </button>
      </div>

      <div className="details-content-wrapper">
        <div className="details-main">
          <div className="details-poster-wrap">
            <LazyImage
              src={posterUrl}
              alt={`${movie.title} poster`}
              className="details-poster"
              fallback="/no-movie.svg"
            />
          </div>

          <div className="details-info">
            <h1 className="details-title">{movie.title}</h1>
            {movie.tagline && <p className="details-tagline">"{movie.tagline}"</p>}

            <div className="details-meta">
              <span className="details-rating" aria-label={`Rating: ${rating} out of 10`}>
                <StarIcon />{rating}
              </span>
              <span className="details-dot" aria-hidden="true">•</span>
              <span>{releaseYear}</span>
              <span className="details-dot" aria-hidden="true">•</span>
              <span>{runtime}</span>
              {movie.original_language && (
                <>
                  <span className="details-dot" aria-hidden="true">•</span>
                  <span>{movie.original_language.toUpperCase()}</span>
                </>
              )}
            </div>

            {movie.genres?.length > 0 && (
              <div className="details-genres" aria-label="Genres">
                {movie.genres.map(g => (
                  <span key={g.id} className="details-genre-pill">{g.name}</span>
                ))}
              </div>
            )}

            {movie.overview && <p className="details-overview">{movie.overview}</p>}

            <button onClick={scrollToPlayer} className="details-watch-btn">▶ Watch Now</button>
          </div>
        </div>

        <div ref={playerRef} className="details-player-section">
          <h2 className="details-player-heading">Watch Movie</h2>
          <VideoPlayer tmdbId={id} title={movie.title} />
        </div>

        <SimilarMovies movieId={id} />
      </div>

      <Footer />
    </div>
  )
}

export default MovieDetailsPage