import { Link } from 'react-router-dom'
import { getPosterUrl, mediaTitle, mediaYear } from '../lib/tmdb'
import { slugify } from '../lib/utils'
import { useUserData } from '../contexts/UserDataContext'
import LazyImage from './LazyImage'
import { PlayIcon, StarIcon } from './icons'

/**
 * MediaCard — poster card for a Movie or a TV Series.
 * The media_type (from our TMDB layer, or passed via `mediaType`) decides the
 * detail link and which date field is shown.
 * Authenticated users additionally see a subtle ✓ Watched / % badge when
 * they have personal progress on this exact title (movies only — a TV badge
 * would be misleading since watch state is per-episode).
 */
const MediaCard = ({ media, mediaType = media?.media_type }) => {
  const { user, getProgress, isWatched } = useUserData()
  const title     = mediaTitle(media)
  const year      = mediaYear(media) || 'N/A'
  const type      = mediaType ?? 'movie'
  const id        = media.id
  const rating    = media.vote_average ? media.vote_average.toFixed(1) : 'N/A'
  const lang      = (media.original_language || '—').toUpperCase()
  const ratingColor = media.vote_average >= 8 ? '#4ade80' : media.vote_average >= 6.5 ? '#f5c518' : '#9ca4ab'
  const posterUrl = getPosterUrl(media.poster_path, 'w342') ?? '/no-movie.svg'

  const typeForUser = type === 'tv' ? 'tv' : 'movie'
  const progress = user && typeForUser === 'movie'
    ? getProgress(`m:${id}`)
    : null
  const watched = user && typeForUser === 'movie' ? isWatched(`m:${id}`) : false
  const percent = progress ? Math.min(100, Math.round(progress.progress_percent ?? 0)) : 0

  return (
    <Link
      to={`/${type}/${id}?title=${slugify(title)}`}
      className="movie-card"
      aria-label={`${title} (${year}) — Rating: ${rating}${watched ? ' — Watched' : ''}`}
      style={{ textDecoration: 'none' }}
    >
      <div className="movie-card-poster-wrap">
        <LazyImage src={posterUrl} alt={`${title} poster`} className="movie-card-poster" />

        {user && watched && (
          <span className="movie-card-watched-badge" aria-label="Watched">✓ Watched</span>
        )}
        {user && !watched && percent > 0 && (
          <span className="movie-card-progress" aria-label={`${percent}% watched`}>
            <span className="movie-card-progress-fill" style={{ width: `${percent}%` }} />
          </span>
        )}

        <div className="movie-card-play-overlay" aria-hidden="true">
          <div className="movie-card-play-btn"><PlayIcon size={18} /></div>
        </div>
      </div>

      <div className="movie-card-info">
        <h3 className="movie-card-title" title={title}>{title}</h3>
        <div className="movie-card-meta">
          <StarIcon size={11} />
          <span className="movie-card-rating" style={{ color: ratingColor }}>{rating}</span>
          <span className="movie-card-dot" aria-hidden="true">·</span>
          <span className="movie-card-year">{year}</span>
          <span className="movie-card-dot" aria-hidden="true">·</span>
          <span className="movie-card-lang">{type === 'tv' ? 'TV' : lang}</span>
        </div>
      </div>
    </Link>
  )
}

export default MediaCard
