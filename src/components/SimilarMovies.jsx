import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSimilarMovies, getPosterUrl } from '../lib/tmdb'
import LazyImage from './LazyImage'

const StarIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="#f5c518" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const slugify = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? ''

const SimilarMovies = ({ movieId }) => {
  const [movies, setMovies] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    fetchSimilarMovies(movieId)
      .then(data => {
        if (!cancelled) {
          setMovies((data.results ?? []).filter(m => m.poster_path).slice(0, 12))
        }
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [movieId])

  if (!isLoading && movies.length === 0) return null

  return (
    <section className="similar-section" aria-label="You might also like">
      <h2 className="similar-heading">You Might Also Like</h2>

      {isLoading ? (
        <div className="similar-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="similar-card-skeleton">
              <div className="similar-poster-skeleton skeleton-pulse" />
              <div className="similar-info-skeleton">
                <div className="skeleton-pulse" style={{ height: 12, borderRadius: 4, width: '75%' }} />
                <div className="skeleton-pulse" style={{ height: 10, borderRadius: 4, width: '45%', marginTop: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="similar-grid">
          {movies.map(movie => {
            const year   = movie.release_date?.split('-')[0] ?? 'N/A'
            const rating = movie.vote_average?.toFixed(1) ?? 'N/A'
            const poster = getPosterUrl(movie.poster_path, 'w342') ?? '/no-movie.svg'
            return (
              // Use Link so all native browser interactions work
              <Link
                key={movie.id}
                to={`/movie/${movie.id}?title=${slugify(movie.title)}`}
                className="similar-card"
                aria-label={`${movie.title} (${year})`}
                style={{ textDecoration: 'none' }}
              >
                <div className="similar-poster-wrap">
                  <LazyImage src={poster} alt={`${movie.title} poster`} className="similar-poster" />
                  <div className="similar-overlay" aria-hidden="true">
                    <span className="similar-play">▶</span>
                  </div>
                </div>
                <div className="similar-info">
                  <p className="similar-title" title={movie.title}>{movie.title}</p>
                  <div className="similar-meta">
                    <StarIcon />
                    <span className="similar-rating">{rating}</span>
                    <span className="similar-dot">·</span>
                    <span className="similar-year">{year}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default SimilarMovies