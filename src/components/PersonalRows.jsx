import { useMemo, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUserData } from '../contexts/UserDataContext'
import { getPosterUrl } from '../lib/tmdb'
import { slugify } from '../lib/utils'
import { fetchTMDB, mediaTitle } from '../lib/tmdb'
import { cachedFetch } from '../lib/cache'
import useHorizontalScroller from '../hooks/useHorizontalScroller'
import { ChevronIcon } from './icons'

/**
 * PersonalRows — authenticated-only sections on the Home page, between the
 * hero carousel and the trending grid. Signed-out visitors see none of this
 * (the guest experience is untouched).
 *
 * Sections (each only renders when non-empty):
 *   Continue Watching · Recently Watched · My List · Favorites · Liked
 * The Home page only renders Continue Watching + Recently Watched (via the
 * `sections` prop); My Library renders the full set.
 *
 * Card art/titles come from the stored poster_path/title captured at save
 * time; anything missing is backfilled with a tiny TMDB lookup, cached.
 */

const ProgressBar = ({ percent }) => (
  <span className="personal-progress" aria-hidden="true">
    <span className="personal-progress-fill" style={{ width: `${percent}%` }} />
  </span>
)

const SectionRow = ({ heading, count, children }) => {
  const { stripRef, canScrollLeft, canScrollRight, scrollByDir, updateArrows } =
    useHorizontalScroller(count)
  return (
    <section className="personal-section" aria-label={heading}>
      <div className="cast-heading-row">
        <h2 className="similar-heading">{heading}</h2>
        <div className="cast-nav" role="group" aria-label={`Scroll ${heading}`}>
          <button type="button" className="cast-nav-btn" onClick={() => scrollByDir('left')} disabled={!canScrollLeft} aria-label="Scroll left">
            <ChevronIcon size={18} dir="left" />
          </button>
          <button type="button" className="cast-nav-btn" onClick={() => scrollByDir('right')} disabled={!canScrollRight} aria-label="Scroll right">
            <ChevronIcon size={18} />
          </button>
        </div>
      </div>
      <div className="personal-row" ref={stripRef} onScroll={updateArrows}>
        {children}
      </div>
    </section>
  )
}

// Fill in title/poster for rows stored without them.
const useMediaMeta = (entries) => {
  const [meta, setMeta] = useState({}) // "type:id" → { title, poster_path }
  const missing = entries.filter(e => e.title == null || e.poster_path == null)
  useEffect(() => {
    let cancelled = false
    Promise.all(missing.map(async (e) => {
      const idStr = `${e.media_type}:${e.tmdb_id}`
      try {
        const data = await cachedFetch(`meta:${idStr}`, () =>
          fetchTMDB(`/${e.media_type}/${e.tmdb_id}`, { language: 'en-US' }))
        return { idStr, title: mediaTitle(data), poster_path: data.poster_path ?? null }
      } catch {
        return { idStr, title: '', poster_path: null }
      }
    })).then((results) => {
      if (cancelled) return
      setMeta(prev => {
        const next = { ...prev }
        for (const r of results) next[r.idStr] = { title: r.title, poster_path: r.poster_path }
        return next
      })
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries.map(e => `${e.media_type}:${e.tmdb_id}`).join(',')])
  return meta
}

const ContinueCard = ({ row }) => {
  const isMovie = row.media_type === 'movie'
  const href = `/${isMovie ? 'movie' : 'tv'}/${row.tmdb_id}?title=${slugify(row.title || '')}`
  const percent = Math.min(100, Math.round(row.progress_percent ?? 0))
  const label = isMovie
    ? (row.title || 'Untitled')
    : `${row.title || 'Show'} · S${row.season_number} E${row.episode_number}`
  return (
    <Link to={href} className="personal-card" aria-label={`Continue ${label} — ${percent}% watched`}>
      <div className="personal-card-poster">
        {row.poster_path
          ? <img src={getPosterUrl(row.poster_path, 'w342')} alt="" loading="lazy" decoding="async" />
          : <span className="personal-card-fallback" aria-hidden="true">🎬</span>}
        <span className="personal-card-play" aria-hidden="true">▶</span>
      </div>
      <span className="personal-card-title" title={label}>{label}</span>
      <ProgressBar percent={percent} />
      <span className="personal-card-sub">{percent}% watched</span>
    </Link>
  )
}

const RecentCard = ({ row }) => {
  const isMovie = row.media_type === 'movie'
  const percent = Math.min(100, Math.round(row.progress_percent ?? 0))
  const label = isMovie
    ? (row.title || 'Untitled')
    : `${row.title || 'Show'} · S${row.season_number} E${row.episode_number}`
  const href = `/${isMovie ? 'movie' : 'tv'}/${row.tmdb_id}?title=${slugify(row.title || '')}`
  return (
    <Link to={href} className="personal-card" aria-label={`Recently watched ${label}`}>
      <div className="personal-card-poster">
        {row.poster_path
          ? <img src={getPosterUrl(row.poster_path, 'w342')} alt="" loading="lazy" decoding="async" />
          : <span className="personal-card-fallback" aria-hidden="true">🎬</span>}
        {percent >= 90 && <span className="personal-card-check" aria-label="Watched">✓</span>}
      </div>
      <span className="personal-card-title" title={label}>{label}</span>
      <ProgressBar percent={percent} />
      <span className="personal-card-sub">{percent >= 90 ? 'Watched' : `${percent}% watched`}</span>
    </Link>
  )
}

// List cards resolve their title/poster via useMediaMeta above.
const ListCard = ({ item }) => {
  const href = `/${item.media_type}/${item.tmdb_id}?title=${slugify(item.title || '')}`
  return (
    <Link to={href} className="personal-card" aria-label={item.title || 'Title'}>
      <div className="personal-card-poster">
        {item.poster_path
          ? <img src={getPosterUrl(item.poster_path, 'w342')} alt="" loading="lazy" decoding="async" />
          : <span className="personal-card-fallback" aria-hidden="true">🎬</span>}
      </div>
      <span className="personal-card-title" title={item.title}>{item.title || '…'}</span>
      <span className="personal-card-sub">{item.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
    </Link>
  )
}

const PersonalRows = ({ sections = ['continue', 'recent', 'mylist', 'favorites', 'liked'] }) => {
  const { user, continueWatching, recentlyWatched, listRows, dbError } = useUserData()
  // List sections are only rendered when requested (Home passes just
  // continue/recent) — skip TMDB meta backfill entirely in that case.
  const wantsLists = sections.some(s => s === 'mylist' || s === 'favorites' || s === 'liked')

  const listEntries = useMemo(() => {
    if (!wantsLists || !listRows?.length) return []
    return listRows.map(r => ({
      key: `${r.list_type}:${r.media_type}:${r.tmdb_id}`,
      list_type: r.list_type,
      media_type: r.media_type,
      tmdb_id: r.tmdb_id,
      title: r.title || null,       // null → backfill via TMDB
      poster_path: r.poster_path ?? null,
    }))
  }, [listRows, wantsLists])

  const meta = useMediaMeta(listEntries)
  const resolve = (e) => {
    const m = meta[`${e.media_type}:${e.tmdb_id}`]
    return { ...e, title: e.title ?? m?.title ?? '', poster_path: e.poster_path ?? m?.poster_path ?? null }
  }

  if (!user || dbError) return null

  const byType = (t) => listEntries.filter(e => e.list_type === t).map(resolve)
  const show = (name) => sections.includes(name)
  const continueVisible = show('continue') && continueWatching.length > 0
  const recentVisible = show('recent') && recentlyWatched.length > 0
  const myList = show('mylist') ? byType('mylist') : []
  const favorites = show('favorites') ? byType('favorite') : []
  const liked = show('liked') ? byType('like') : []

  if (!continueVisible && !recentVisible && myList.length === 0 && favorites.length === 0 && liked.length === 0) {
    return null
  }

  return (
    <div className="personal-rows">
      {continueVisible && (
        <SectionRow heading="Continue Watching" count={continueWatching.length}>
          {continueWatching.map(row => <ContinueCard key={row.key} row={row} />)}
        </SectionRow>
      )}

      {recentVisible && (
        <SectionRow heading="Recently Watched" count={recentlyWatched.length}>
          {recentlyWatched.filter(r => !continueWatching.some(c => c.key === r.key)).map(row => (
            <RecentCard key={row.key} row={row} />
          ))}
        </SectionRow>
      )}

      {myList.length > 0 && (
        <SectionRow heading="My List" count={myList.length}>
          {myList.map(e => <ListCard key={e.key} item={e} />)}
        </SectionRow>
      )}

      {favorites.length > 0 && (
        <SectionRow heading="Favorites" count={favorites.length}>
          {favorites.map(e => <ListCard key={e.key} item={e} />)}
        </SectionRow>
      )}

      {liked.length > 0 && (
        <SectionRow heading="Liked" count={liked.length}>
          {liked.map(e => <ListCard key={e.key} item={e} />)}
        </SectionRow>
      )}
    </div>
  )
}

export default PersonalRows
