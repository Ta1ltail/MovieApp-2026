import { Link } from 'react-router-dom'
import { getPosterUrl } from '../lib/tmdb'
import LazyImage from './LazyImage'

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
)

const StarIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="#f5c518" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const slugify = (str) =>
  str?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ?? ''

const MovieCard = ({ movie }) => {
  const { id, title, vote_average, poster_path, release_date, original_language } = movie

  const posterUrl    = getPosterUrl(poster_path, 'w342') ?? '/no-movie.svg'
  const year         = release_date?.split('-')[0] ?? 'N/A'
  const rating       = vote_average ? vote_average.toFixed(1) : 'N/A'
  const lang         = original_language?.toUpperCase() ?? '—'
  const ratingColor  = vote_average >= 8 ? '#4ade80' : vote_average >= 6.5 ? '#f5c518' : '#9ca4ab'

  return (
    <Link
      to={`/movie/${id}?title=${slugify(title)}`}
      className="movie-card"
      aria-label={`${title} (${year}) — Rating: ${rating}`}
      style={{ textDecoration: 'none' }}
    >
      <div className="movie-card-poster-wrap">
        <LazyImage src={posterUrl} alt={`${title} poster`} className="movie-card-poster" />

        <div className="movie-card-play-overlay" aria-hidden="true">
          <div className="movie-card-play-btn"><PlayIcon /></div>
        </div>
      </div>

      <div className="movie-card-info">
        <h3 className="movie-card-title" title={title}>{title}</h3>
        <div className="movie-card-meta">
          <StarIcon />
          <span className="movie-card-rating" style={{ color: ratingColor }}>{rating}</span>
          <span className="movie-card-dot" aria-hidden="true">·</span>
          <span className="movie-card-year">{year}</span>
          <span className="movie-card-dot" aria-hidden="true">·</span>
          <span className="movie-card-lang">{lang}</span>
        </div>
      </div>
    </Link>
  )
}

export default MovieCard