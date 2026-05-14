import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Spinner from '../components/Spinner'
import VideoPlayer from '../components/VideoPlayer'

const API_BASE_URL = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY

const API_OPTION = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  },
}

const MovieDetailsPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const playerRef = useRef(null)

  useEffect(() => {
    const fetchMovieDetails = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch(
          `${API_BASE_URL}/movie/${id}?append_to_response=credits`,
          API_OPTION
        )
        if (!response.ok) throw new Error('Movie not found')
        const data = await response.json()
        setMovie(data)
      } catch (err) {
        setError('Failed to load movie details.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMovieDetails()
    // Scroll to top when navigating to a new movie
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [id])

  const scrollToPlayer = () => {
    playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-primary flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">{error || 'Movie not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="details-back-btn"
        >
          ← Back to Home
        </button>
      </div>
    )
  }

  const backdropUrl = movie.backdrop_path
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : null

  const posterUrl = movie.poster_path
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : '/no-movie.svg'

  const releaseYear = movie.release_date?.split('-')[0] ?? 'N/A'
  const runtime = movie.runtime
    ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`
    : 'N/A'

  return (
    <div className="details-page">
      {/* ── Backdrop Hero ── */}
      <div className="details-backdrop">
        {backdropUrl && (
          <img
            src={backdropUrl}
            alt={movie.title}
            className="details-backdrop-img"
          />
        )}
        <div className="details-backdrop-overlay" />

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="details-back-btn details-back-btn--absolute"
        >
          ← Back
        </button>
      </div>

      {/* ── Content ── */}
      <div className="details-content-wrapper">
        <div className="details-main">
          {/* Poster */}
          <div className="details-poster-wrap">
            <img src={posterUrl} alt={movie.title} className="details-poster" />
          </div>

          {/* Info */}
          <div className="details-info">
            <h1 className="details-title">{movie.title}</h1>

            {movie.tagline && (
              <p className="details-tagline">"{movie.tagline}"</p>
            )}

            {/* Meta row */}
            <div className="details-meta">
              <span className="details-rating">
                <img src="/star.svg" alt="rating" className="details-star" />
                {movie.vote_average?.toFixed(1) ?? 'N/A'}
              </span>
              <span className="details-dot">•</span>
              <span>{releaseYear}</span>
              <span className="details-dot">•</span>
              <span>{runtime}</span>
            </div>

            {/* Genres */}
            {movie.genres?.length > 0 && (
              <div className="details-genres">
                {movie.genres.map((g) => (
                  <span key={g.id} className="details-genre-pill">
                    {g.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview */}
            {movie.overview && (
              <p className="details-overview">{movie.overview}</p>
            )}

            {/* Watch button */}
            <button onClick={scrollToPlayer} className="details-watch-btn">
              ▶ Watch Now
            </button>
          </div>
        </div>

        {/* ── Video Player ── */}
        <div ref={playerRef} className="details-player-section">
          <h2 className="details-player-heading">Watch Movie</h2>
          <VideoPlayer tmdbId={id} title={movie.title} />
        </div>
      </div>
    </div>
  )
}

export default MovieDetailsPage