import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchSimilar, getPosterUrl, mediaTitle, mediaYear } from '../lib/tmdb'
import { slugify } from '../lib/utils'
import LazyImage from './LazyImage'
import { StarIcon } from './icons'

const SimilarGrid = ({ mediaType, id, heading = 'You Might Also Like' }) => {
  const [movies, setMovies] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchSimilar(mediaType, id)
      .then(data => {
        if (!cancelled) {
          setMovies((data.results ?? []).filter(m => m.poster_path).slice(0, 12))
        }
      })
      .catch(err => {
        if (!cancelled) setError(err?.message ?? 'Failed to load recommendations')
      })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [mediaType, id])

  if (!isLoading && !error && movies.length === 0) return null

  return (
    <section className="similar-section" aria-label="You might also like">
      <h2 className="similar-heading">{heading}</h2>

      {error ? (
        <p className="empty-state-text" style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Couldn't load recommendations.
        </p>
      ) : isLoading ? (
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
            const year   = mediaYear(movie) || 'N/A'
            const rating = movie.vote_average?.toFixed(1) ?? 'N/A'
            const poster = getPosterUrl(movie.poster_path, 'w342') ?? '/no-movie.svg'
            const title  = mediaTitle(movie)
            return (
              <Link
                key={`${mediaType}-${movie.id}`}
                to={`/${mediaType}/${movie.id}?title=${slugify(title)}`}
                className="similar-card"
                aria-label={`${title} (${year})`}
                style={{ textDecoration: 'none' }}
              >
                <div className="similar-poster-wrap">
                  <LazyImage src={poster} alt={`${title} poster`} className="similar-poster" />
                  <div className="similar-overlay" aria-hidden="true">
                    <span className="similar-play">▶</span>
                  </div>
                </div>
                <div className="similar-info">
                  <p className="similar-title" title={title}>{title}</p>
                  <div className="similar-meta">
                    <StarIcon size={10} />
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

export default SimilarGrid
