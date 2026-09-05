import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  fetchDetails, fetchSeasonEpisodes,
  getPosterUrl, getBackdropUrl,
  mediaTitle, mediaYear,
} from '../lib/tmdb'
import { sortSeasons } from '../lib/utils'

const sanitizeError = (err) => {
  if (err?.message?.startsWith('TMDB ')) {
    const code = err.message.match(/TMDB (\d+)/)?.[1]
    if (code === '401' || code === '403') return 'TMDB API key is missing or invalid — add VITE_TMDB_API_KEY to your .env file.'
    if (code === '404') return 'This title could not be found. It may have been removed from TMDB.'
    if (code === '429') return 'TMDB rate limit reached — please wait a moment and try again.'
  }
  return err?.message ?? 'Failed to load details.'
}
import Navbar from '../components/Navbar'
import VideoPlayer from '../components/VideoPlayer'
import CastStrip from '../components/CastStrip'
import SeasonsSection from '../components/SeasonsSection'
import SimilarGrid from '../components/SimilarGrid'
import LazyImage from '../components/LazyImage'
import Footer from '../components/Footer'
import { StarIcon } from '../components/icons'

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const firstUsableSeason = (detail) => {
  if (detail.seasons?.length) {
    // Prefer a regular season (1+) over Season 0 (Specials) when picking
    // the default, so users land on actual episodes first.
    const regular = detail.seasons.find(s => s.episode_count > 0 && s.season_number >= 1)
    if (regular) return regular.season_number
    const anyWithEpisodes = detail.seasons.find(s => s.episode_count > 0)
    return (anyWithEpisodes ?? detail.seasons[0]).season_number
  }
  return 1
}

const MediaDetailsPage = ({ mediaType }) => {
  const { id } = useParams()
  // Key by type+id so switching titles remounts with fresh state.
  return <MediaDetailsContent key={`${mediaType}-${id}`} mediaType={mediaType} id={id} />
}

const MediaDetailsContent = ({ mediaType, id }) => {
  const navigate = useNavigate()
  const playerRef = useRef(null)

  const [detail, setDetail]       = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState('')

  // TV: selected season + its episodes
  const [seasonNumber, setSeasonNumber]       = useState(null)
  const [episodes, setEpisodes]               = useState([])
  const [episodesLoading, setEpisodesLoading] = useState(false)
  const [episodesError, setEpisodesError]     = useState('')
  const [episodesReload, setEpisodesReload]   = useState(0)

  // What the player should be showing (null = player closed)
  const [play, setPlay] = useState(null) // { season_number, episode_number, name }

  // Exact episode counts for every season whose list we've loaded (state so
  // it can be read during render). The ref holds the full lists and is only
  // touched from event handlers.
  const [loadedCounts, setLoadedCounts] = useState({})
  const seasonsCacheRef = useRef(new Map())

  useEffect(() => {
    let cancelled = false
    fetchDetails(mediaType, id)
      .then(data => {
        if (cancelled) return
        setDetail(data)
        if (mediaType === 'tv') setSeasonNumber(firstUsableSeason(data))
        setIsLoading(false)
      })
      .catch(err => { if (!cancelled) { setError(sanitizeError(err)); setIsLoading(false) } })
    return () => { cancelled = true }
  }, [mediaType, id])

  // TV: load episodes whenever the selected season changes (or is retried).
  const episodesKey = `${id}:${seasonNumber ?? ''}:${episodesReload}`
  const [prevEpisodesKey, setPrevEpisodesKey] = useState(episodesKey)
  if (episodesKey !== prevEpisodesKey) {
    setPrevEpisodesKey(episodesKey)
    setEpisodesLoading(true)
    setEpisodesError('')
  }

  useEffect(() => {
    if (mediaType !== 'tv' || seasonNumber == null) return
    let cancelled = false
    fetchSeasonEpisodes(id, seasonNumber)
      .then(data => {
        if (cancelled) return
        const withSeason = (data.episodes ?? []).map(ep => ({
          ...ep,
          season_number: data.season_number ?? seasonNumber,
        }))
        setEpisodes(withSeason)
        seasonsCacheRef.current.set(seasonNumber, withSeason)
        setLoadedCounts(prev => ({ ...prev, [seasonNumber]: withSeason.length }))
        setEpisodesLoading(false)
        // If the player landed on this season with a placeholder name (e.g.
        // crossed here via Next/Prev), swap in the real episode title.
        setPlay(p => {
          if (!p || p.season_number !== seasonNumber) return p
          const match = withSeason.find(e => e.episode_number === p.episode_number)
          return match && p.name !== match.name ? { ...p, name: match.name } : p
        })
      })
      .catch(err => {
        if (cancelled) return
        setEpisodesError(sanitizeError(err) ?? 'Failed to load episodes.')
        setEpisodesLoading(false)
      })
    return () => { cancelled = true }
  }, [mediaType, id, seasonNumber, episodesReload])

  // When playback starts, bring the player into view.
  useEffect(() => {
    if (play && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [play])

  if (isLoading) {
    return (
      <div className="details-page">
        <Navbar />
        <div className="details-loading" role="status" aria-label="Loading details">
          <svg className="details-loading-spinner" viewBox="0 0 50 50" fill="none" aria-hidden="true">
            <circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <path d="M25 5 A20 20 0 0 1 45 25" stroke="#AB8BFF" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="details-page">
        <Navbar />
        <div className="error-state details-error-state">
          <div className="error-state-icon">⚠️</div>
          <h2 className="error-state-title">Failed to load {mediaType === 'tv' ? 'series' : 'movie'}</h2>
          <p className="error-state-text">{error}</p>
          <button className="error-state-btn" onClick={() => navigate(-1)}>Go back</button>
        </div>
      </div>
    )
  }

  const title     = mediaTitle(detail)
  const year      = mediaYear(detail) || 'N/A'
  const rating    = detail.vote_average?.toFixed(1) ?? 'N/A'
  const isTv      = mediaType === 'tv'
  const posterUrl = getPosterUrl(detail.poster_path, 'w500') ?? '/no-movie.svg'
  const backdropUrl = getBackdropUrl(detail.backdrop_path, 'original')
  const runtime = !isTv && detail.runtime
    ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m`
    : null
  const cast = detail.credits?.cast ?? []

  // ── TV: Prev / Next episode helpers ───────────────────────────────────────
  const playSeason    = play?.season_number
  const playEpisodeNo = play?.episode_number
  const navSeasons    = isTv ? sortSeasons(detail.seasons ?? []) : []

  // How many episodes a season has: prefer its loaded list (exact count),
  // then TMDB's metadata count.
  const episodeCountOf = (sNum) => {
    const loaded = loadedCounts[sNum]
    if (loaded) return loaded
    const meta = navSeasons.find(s => s.season_number === sNum)
    return meta?.episode_count ?? 0
  }

  const playEpisode = (ep) => {
    setPlay({
      season_number: ep.season_number ?? seasonNumber,
      episode_number: ep.episode_number,
      name: ep.name ?? `Episode ${ep.episode_number}`,
    })
  }

  const playDefault = () => {
    if (isTv) {
      const seasonEps = episodes.filter(e => e.season_number === seasonNumber)
      const first = seasonEps.length > 0 ? seasonEps[0] : null
      playEpisode(first ?? { season_number: seasonNumber, episode_number: 1, name: 'Episode 1' })
    } else {
      setPlay({})
    }
  }

  // Move +1 / -1 within the current play position, crossing season
  // boundaries logically (next season's E1 / previous season's last episode).
  const stepPlay = (delta) => {
    if (!play || !isTv || playSeason == null) return

    // Prefer the exact episode list when this season is known (state or cache).
    const known = seasonsCacheRef.current.get(playSeason) ??
      (playSeason === seasonNumber && !episodesLoading
        ? episodes.filter(e => e.season_number === playSeason)
        : [])
    const currentIdx = known.findIndex(e => e.episode_number === playEpisodeNo)
    const seasonTotal = episodeCountOf(playSeason)

    // Same-season step (exact list order — handles non-sequential episodes).
    if (currentIdx !== -1) {
      const targetIdx = currentIdx + delta
      if (targetIdx >= 0 && targetIdx < known.length) {
        const ep = known[targetIdx]
        setPlay({ season_number: ep.season_number, episode_number: ep.episode_number, name: ep.name })
        return
      }
    }

    // Fallback for a season whose list isn't loaded yet: step numerically
    // within the season so we never accidentally skip to another season.
    const nextNumber = playEpisodeNo + delta
    if (nextNumber >= 1 && nextNumber <= seasonTotal) {
      setPlay({ season_number: playSeason, episode_number: nextNumber, name: `Episode ${nextNumber}` })
      return
    }

    // Cross a season boundary (only reached at a genuine season edge).
    const pos = navSeasons.findIndex(s => s.season_number === playSeason)
    if (pos === -1) return
    if (delta === 1) {
      const next = navSeasons.slice(pos + 1).find(s => s.episode_count > 0)
      if (!next) return
      setSeasonNumber(next.season_number)
      setPlay({ season_number: next.season_number, episode_number: 1, name: 'Episode 1' })
    } else {
      const prev = navSeasons.slice(0, pos).reverse().find(s => s.episode_count > 0)
      if (!prev) return
      const lastEp = episodeCountOf(prev.season_number)
      if (!lastEp) return
      setSeasonNumber(prev.season_number)
      setPlay({ season_number: prev.season_number, episode_number: lastEp, name: `Episode ${lastEp}` })
    }
  }

  // Button visibility: hide when there is genuinely no previous/next step.
  const navPos = playSeason != null
    ? navSeasons.findIndex(s => s.season_number === playSeason)
    : -1
  const hasPrevSeason = navPos > 0 && navSeasons.slice(0, navPos).some(s => s.episode_count > 0)
  const hasNextSeason = navPos !== -1 && navSeasons.slice(navPos + 1).some(s => s.episode_count > 0)
  const seasonCount = playSeason != null ? episodeCountOf(playSeason) : 0
  const hasPrev = (() => {
    if (!play || !isTv || playSeason == null) return false
    if (playEpisodeNo > 1) return true
    return hasPrevSeason
  })()
  const hasNext = (() => {
    if (!play || !isTv || playSeason == null) return false
    if (playEpisodeNo < seasonCount) return true
    return hasNextSeason
  })()

  const playingSeason  = play?.season_number ?? seasonNumber
  const playingEpisode = play?.episode_number ?? 1
  const isGenericEpisodeName = !play?.name || /^Episode \d+$/.test(play.name)
  const playerSubtitle = isTv
    ? (isGenericEpisodeName ? title : `${title} · ${play.name}`)
    : title

  return (
    <div className="details-page">
      <Navbar />

      {backdropUrl && (
        <div className="details-backdrop">
          <img
            src={getBackdropUrl(detail.backdrop_path, 'w1280')}
            srcSet={`${getBackdropUrl(detail.backdrop_path, 'w780')} 780w, ${getBackdropUrl(detail.backdrop_path, 'w1280')} 1280w, ${getBackdropUrl(detail.backdrop_path, 'original')} 1920w`}
            sizes="100vw"
            alt=""
            className="details-backdrop-img"
            loading="eager"
            decoding="async"
          />
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
            <LazyImage src={posterUrl} alt={`${title} poster`} className="details-poster" />
          </div>

          <div className="details-info">
            <h1 className="details-title">{title}</h1>
            {detail.tagline && <p className="details-tagline">"{detail.tagline}"</p>}

            <div className="details-meta">
              <span className="details-rating">
                <StarIcon size={16} />
                <span>{rating}</span>
              </span>
              <span className="details-dot" aria-hidden="true">·</span>
              <span>{year}</span>
              {runtime && (
                <>
                  <span className="details-dot" aria-hidden="true">·</span>
                  <span>{runtime}</span>
                </>
              )}
              {isTv && (
                <>
                  <span className="details-dot" aria-hidden="true">·</span>
                  <span>
                    {detail.number_of_seasons ?? '—'} season{(detail.number_of_seasons ?? 0) !== 1 ? 's' : ''}
                    {' · '}
                    {detail.number_of_episodes ?? '—'} episodes
                  </span>
                </>
              )}
            </div>

            {detail.genres?.length > 0 && (
              <div className="details-genres">
                {detail.genres.map(g => (
                  <span key={g.id} className="details-genre-pill">{g.name}</span>
                ))}
              </div>
            )}

            {detail.overview && <p className="details-overview">{detail.overview}</p>}

            {!isTv && (
              <button
                className="details-watch-btn"
                onClick={playDefault}
                aria-label={`Watch ${title}`}
              >
                ▶ Watch Now
              </button>
            )}
            {isTv && (
              <button
                className="details-watch-btn"
                onClick={playDefault}
                aria-label={`Play ${title} season ${seasonNumber ?? 1}`}
              >
                ▶ Play Season {seasonNumber ?? 1}
              </button>
            )}
          </div>
        </div>

        {/* Player */}
        {play && (
          <div className="details-player-section" ref={playerRef}>
            <h2 className="details-player-heading">
              {isTv
                ? `Now Playing — S${playingSeason}E${playingEpisode}${play?.name ? ` · ${play.name}` : ''}`
                : 'Now Playing'}
            </h2>
            <VideoPlayer
              tmdbId={id}
              mediaType={mediaType}
              season={playingSeason}
              episode={playingEpisode}
              title={playerSubtitle}
            />

            {/* Prev / Next episode — under the player, only when applicable */}
            {isTv && (hasPrev || hasNext) && (
              <div className="vp-episode-nav" aria-label="Episode navigation">
                {hasPrev ? (
                  <button type="button" className="vp-episode-nav-btn" onClick={() => stepPlay(-1)}>
                    <span aria-hidden="true">‹</span> Previous Episode
                  </button>
                ) : <span className="vp-episode-nav-spacer" aria-hidden="true" />}
                <span className="vp-episode-nav-current" aria-live="polite">
                  S{playingSeason}E{playingEpisode}
                </span>
                {hasNext ? (
                  <button type="button" className="vp-episode-nav-btn vp-episode-nav-btn--next" onClick={() => stepPlay(1)}>
                    Next Episode <span aria-hidden="true">›</span>
                  </button>
                ) : <span className="vp-episode-nav-spacer" aria-hidden="true" />}
              </div>
            )}
          </div>
        )}

        {/* TV: seasons + episodes */}
        {isTv && (
          <SeasonsSection
            seasons={detail.seasons}
            seasonNumber={seasonNumber}
            onSeasonChange={setSeasonNumber}
            episodes={episodes}
            episodesLoading={episodesLoading}
            episodesError={episodesError}
            onRetryEpisodes={() => setEpisodesReload(r => r + 1)}
            activePlay={play}
            onPlayEpisode={playEpisode}
          />
        )}

        <CastStrip cast={cast} />

        <SimilarGrid mediaType={mediaType} id={id} heading={isTv ? 'More Like This' : 'You Might Also Like'} />
      </div>

      <Footer />
    </div>
  )
}

export default MediaDetailsPage
