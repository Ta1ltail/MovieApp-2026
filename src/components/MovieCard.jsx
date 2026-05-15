import { useNavigate } from 'react-router-dom'
import { getPosterUrl } from '../lib/tmdb'

const MovieCard = ({ movie }) => {
  const navigate = useNavigate()
  const {
    id, title, vote_average, poster_path,
    release_date, original_language, genre_ids,
  } = movie

  const posterUrl = getPosterUrl(poster_path) ?? '/no-movie.svg'
  const year = release_date?.split('-')[0] ?? 'N/A'
  const rating = vote_average ? vote_average.toFixed(1) : 'N/A'
  const lang = original_language?.toUpperCase() ?? '—'

  const handleClick = () => navigate(`/movie/${id}`)
  const handleKey = (e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }

  return (
    <article
      className="movie-card"
      onClick={handleClick}
      onKeyDown={handleKey}
      role="button"
      tabIndex={0}
      aria-label={`${title} (${year}) — Rating: ${rating}`}
    >
      {/* Poster */}
      <div className="movie-card-poster-wrap">
        <img
          src={posterUrl}
          alt={`${title} poster`}
          loading="lazy"
          decoding="async"
          onError={(e) => { e.currentTarget.src = '/no-movie.svg' }}
        />
        <div className="movie-card-play-overlay" aria-hidden="true">
          <div className="movie-card-play-btn">▶</div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4">
        <h3 title={title}>{title}</h3>
        <div className="content">
          <div className="rating">
            <img src="/star.svg" alt="" aria-hidden="true" />
            <p aria-label={`Rating: ${rating}`}>{rating}</p>
          </div>
          <span aria-hidden="true">•</span>
          <p className="lang" aria-label={`Language: ${lang}`}>{lang}</p>
          <span aria-hidden="true">•</span>
          <p className="year" aria-label={`Year: ${year}`}>{year}</p>
        </div>
      </div>
    </article>
  )
}

export default MovieCard