import { useState, useCallback } from 'react'
import { getPosterUrl } from '../lib/tmdb'
import { buildPages, sortSeasons } from '../lib/utils'
import { ChevronIcon, PlayIcon } from './icons'

export const EPISODES_PER_PAGE = 12

const seasonLabel = (s) => (s.season_number === 0 ? 'Specials' : `Season ${s.season_number}`)

/**
 * SeasonsSection — TV-only picker.
 *
 * Seasons are shown as selectable poster cards. Picking a season loads (via the
 * parent) and displays ONLY that season's episodes, paginated 12 per page.
 * The currently-playing episode is highlighted and its page is shown whenever
 * the active episode changes (e.g. via the player's next/prev controls).
 */
const SeasonsSection = ({
  seasons = [],
  seasonNumber,
  onSeasonChange,
  episodes = [],
  episodesLoading = false,
  episodesError = '',
  onRetryEpisodes,
  activePlay,            // { season_number, episode_number } currently playing
  onPlayEpisode,
}) => {
  const play = useCallback((ep) => onPlayEpisode?.(ep), [onPlayEpisode])

  const sortedSeasons = sortSeasons(seasons)

  // The loaded episode list always belongs to the selected season, so only
  // rows stamped with the current season number are meaningful.
  const seasonEpisodes = episodes.filter(e => e.season_number === seasonNumber)

  // Pagination state, reset whenever the selected season changes. Guarded
  // render-phase reset (same pattern as the rest of the app — no effects).
  // 1-indexed to match the rest of the app's pagination conventions.
  const [epPage, setEpPage] = useState(1)
  const syncSig = [
    seasonNumber,
    activePlay && activePlay.season_number === seasonNumber ? activePlay.episode_number : '',
    seasonEpisodes.length,
    seasonEpisodes[0]?.id ?? '',
    seasonEpisodes[seasonEpisodes.length - 1]?.id ?? '',
  ].join('|')
  const [prevSyncSig, setPrevSyncSig] = useState(syncSig)
  if (syncSig !== prevSyncSig) {
    setPrevSyncSig(syncSig)
    // No active episode here (season switch / empty list) → back to page 1.
    if (!activePlay || activePlay.season_number !== seasonNumber) {
      setEpPage(1)
    } else {
      // Otherwise jump to the page containing the playing episode.
      const idx = seasonEpisodes.findIndex(e => e.episode_number === activePlay.episode_number)
      if (idx !== -1) setEpPage(Math.floor(idx / EPISODES_PER_PAGE) + 1)
    }
  }

  const totalPages = Math.max(1, Math.ceil(seasonEpisodes.length / EPISODES_PER_PAGE))
  const safePage   = Math.min(epPage, totalPages)
  const startIdx   = (safePage - 1) * EPISODES_PER_PAGE
  const visibleEpisodes = seasonEpisodes.slice(startIdx, startIdx + EPISODES_PER_PAGE)
  const showPager  = !episodesLoading && !episodesError && totalPages > 1

  const activeSeasonMeta = sortedSeasons.find(s => s.season_number === seasonNumber)

  // Prev/Next season navigation — same visual language as the Cast strip's
  // slide arrows, but it steps the SELECTED season instead of scrolling.
  const seasonIndex = sortedSeasons.findIndex(s => s.season_number === seasonNumber)
  const stepSeason = (delta) => {
    const target = sortedSeasons[seasonIndex + delta]
    if (target) onSeasonChange(target.season_number)
  }
  const canStepPrev = seasonIndex > 0
  const canStepNext = seasonIndex !== -1 && seasonIndex < sortedSeasons.length - 1

  if (sortedSeasons.length === 0) return null

  return (
    <section className="seasons-section" aria-label="Seasons and episodes">
      <div className="cast-heading-row">
        <h2 className="details-player-heading">Seasons</h2>
        {sortedSeasons.length > 1 && (
          <div className="cast-nav" role="group" aria-label="Previous and next season">
            <button
              type="button"
              className="cast-nav-btn"
              onClick={() => stepSeason(-1)}
              disabled={!canStepPrev}
              aria-label="Previous season"
            >
              <ChevronIcon size={18} dir="left" />
            </button>
            <button
              type="button"
              className="cast-nav-btn"
              onClick={() => stepSeason(1)}
              disabled={!canStepNext}
              aria-label="Next season"
            >
              <ChevronIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Season cards */}
      <div className="season-cards" role="group" aria-label="Select a season">
        {sortedSeasons.map(s => {
          const active = s.season_number === seasonNumber
          const poster = getPosterUrl(s.poster_path, 'w342')
          const airYear = String(s.air_date || '').slice(0, 4)
          return (
            <button
              key={s.id ?? s.season_number}
              type="button"
              className={`season-card${active ? ' season-card--active' : ''}`}
              aria-pressed={active}
              aria-label={`${seasonLabel(s)} — ${s.episode_count ?? 0} episodes`}
              onClick={() => onSeasonChange(s.season_number)}
            >
              <div className="season-card-poster-wrap">
                {poster ? (
                  <img src={poster} alt="" className="season-card-poster" loading="lazy" decoding="async" />
                ) : (
                  <span className="season-card-poster-fallback" aria-hidden="true">
                    {s.season_number === 0 ? 'S0' : `S${s.season_number}`}
                  </span>
                )}
              </div>
              <div className="season-card-info">
                <span className="season-card-name">{seasonLabel(s)}</span>
                <span className="season-card-meta">
                  {s.episode_count ?? 0} episode{(s.episode_count ?? 0) !== 1 ? 's' : ''}
                  {airYear ? ` · ${airYear}` : ''}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Episodes of the selected season */}
      <div className="season-episodes-block">
        <h3 className="season-episodes-heading">
          Episodes{activeSeasonMeta ? ` — ${seasonLabel(activeSeasonMeta)}` : ''}
        </h3>

        {episodesLoading && (
          <div className="episode-list" aria-busy="true">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="episode-row episode-row--skeleton skeleton-pulse" />
            ))}
          </div>
        )}

        {episodesError && (
          <div className="error-state" role="alert">
            <p className="error-state-text">{episodesError}</p>
            <button className="empty-state-btn" onClick={onRetryEpisodes}>Try again</button>
          </div>
        )}

        {!episodesLoading && !episodesError && seasonEpisodes.length === 0 && (
          <p className="season-episodes-empty">No episodes available for this season yet.</p>
        )}

        {!episodesLoading && !episodesError && seasonEpisodes.length > 0 && (
          <ul className="episode-list">
            {visibleEpisodes.map(ep => {
              const isActive =
                activePlay &&
                activePlay.season_number === ep.season_number &&
                activePlay.episode_number === ep.episode_number
              const still = getPosterUrl(ep.still_path, 'w300') // stills use the image CDN too
              const airYear = String(ep.air_date || '').slice(0, 4)
              return (
                <li key={`${ep.season_number}-${ep.episode_number}`} className={`episode-row${isActive ? ' episode-row--active' : ''}`}>
                  <div className="episode-still-wrap">
                    {still
                      ? <img src={still} alt="" className="episode-still" loading="lazy" decoding="async" />
                      : <span className="episode-still episode-still--placeholder" aria-hidden="true">🎬</span>}
                    <button
                      className="episode-play-btn"
                      onClick={() => play(ep)}
                      aria-label={`Play ${ep.name || `Episode ${ep.episode_number}`}`}
                    >
                      <PlayIcon size={14} />
                    </button>
                  </div>
                  <div className="episode-info">
                    <div className="episode-title-row">
                      <span className="episode-number">E{ep.episode_number}</span>
                      <h4 className="episode-title">{ep.name || `Episode ${ep.episode_number}`}</h4>
                      {isActive && <span className="episode-now-playing">Now Playing</span>}
                    </div>
                    {ep.overview && <p className="episode-overview">{ep.overview}</p>}
                    <div className="episode-meta">
                      {typeof ep.runtime === 'number' && ep.runtime > 0 && (
                        <span>{ep.runtime} min</span>
                      )}
                      {airYear && <span>{airYear}</span>}
                      {typeof ep.vote_average === 'number' && ep.vote_average > 0 && (
                        <span>★ {ep.vote_average.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {/* Episode pagination: max 12 per page */}
        {showPager && (
          <nav className="episode-pager" aria-label="Episode list pagination">
            <button
              className="episode-pager-btn episode-pager-btn--arrow"
              onClick={() => setEpPage(safePage - 1)}
              disabled={safePage <= 1}
              aria-label="Previous episodes"
            >
              ‹
            </button>
            {buildPages(safePage, totalPages).map((p) => {
              if (typeof p === 'string') {
                const target = p === '…start' ? 1 : totalPages
                return (
                  <button
                    key={p}
                    className="episode-pager-btn episode-pager-btn--ellipsis"
                    onClick={() => setEpPage(target)}
                    aria-label={`Jump to episode page ${target}`}
                  >
                    …
                  </button>
                )
              }
              return (
                <button
                  key={p}
                  className={`episode-pager-btn${p === safePage ? ' episode-pager-btn--active' : ''}`}
                  onClick={() => setEpPage(p)}
                  aria-label={`Episodes ${(p - 1) * EPISODES_PER_PAGE + 1}–${Math.min(p * EPISODES_PER_PAGE, seasonEpisodes.length)}`}
                  aria-current={p === safePage ? 'page' : undefined}
                >
                  {p}
                </button>
              )
            })}
            <button
              className="episode-pager-btn episode-pager-btn--arrow"
              onClick={() => setEpPage(safePage + 1)}
              disabled={safePage >= totalPages}
              aria-label="Next episodes"
            >
              ›
            </button>
          </nav>
        )}
      </div>
    </section>
  )
}

export default SeasonsSection
