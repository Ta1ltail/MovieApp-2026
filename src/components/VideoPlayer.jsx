import { useState, useRef, useEffect, useCallback } from 'react'

// Each server builds an embed URL for a movie or a TV episode.
// Movie URLs are unchanged from previous versions.
//
// `quality` is the stream quality these embed services are documented to
// typically serve ('HD' / 'SD'). It's a provider-level default — an embed
// can't be probed for its actual resolution — so servers with no stable
// known quality (e.g. 2Embed, which mixes sources) leave it out and the
// badge simply doesn't appear instead of guessing.
const SERVERS = [
  {
    id:      'vidsrc-ru',
    name:    'VidSrc',
    badge:   'MULTI',
    quality: 'HD',
    getUrl: ({ mediaType, tmdbId, season, episode, subtitleUrl, dsLang = 'en' }) => {
      if (mediaType === 'tv') {
        let url = `https://vidsrc-embed.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=jw&title=true&poster=true&autoplay=false&nextbutton=false&ds_lang=${dsLang}`
        if (subtitleUrl) url += `&sub_url=${encodeURIComponent(subtitleUrl)}`
        return url
      }
      let url = `https://vidsrc-embed.ru/embed/movie?tmdb=${tmdbId}&primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=jw&title=true&poster=true&autoplay=false&nextbutton=false&ds_lang=${dsLang}`
      if (subtitleUrl) url += `&sub_url=${encodeURIComponent(subtitleUrl)}`
      return url
    },
  },
  {
    id:      'vaplayer-ru',
    name:    'VaPlayer',
    badge:   'HD',
    quality: 'HD',
    getUrl: ({ mediaType, tmdbId, season, episode, subtitleUrl, subtitleLabel = 'English' }) => {
      if (mediaType === 'tv') {
        let url = `https://vaplayer.ru/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}&autoplay=false`
        if (subtitleUrl) url += `&sub_file=${subtitleUrl}&sub_label=${subtitleLabel}`
        return url
      }
      let url = `https://vaplayer.ru/embed/movie?tmdb=${tmdbId}&autoplay=false`
      if (subtitleUrl) url += `&sub_file=${subtitleUrl}&sub_label=${subtitleLabel}`
      return url
    },
  },
  {
    id:      'vidlink.pro',
    name:    'VidLink',
    badge:   'SUB',
    quality: 'HD',
    getUrl: ({ mediaType, tmdbId, season, episode }) => {
      const base = 'primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=jw&title=true&poster=true&autoplay=false&nextbutton=false&tmdb=1&defaultSubtitle=en'
      if (mediaType === 'tv') return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}?${base}`
      return `https://vidlink.pro/movie/${tmdbId}?${base}`
    },
  },
  {
    id:    '2embed.cc',
    name:  '2Embed',
    badge: '',
    getUrl: ({ mediaType, tmdbId, season, episode }) => {
      if (mediaType === 'tv') return `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`
      return `https://www.2embed.cc/embed/${tmdbId}`
    },
  },
]

// ── Player security ────────────────────────────────────────────────────────
// Cross-origin embeds are constrained by the same-origin policy: they cannot
// read/write the parent's DOM, history, location, or cookies. The `allow`
// attribute below explicitly grants only the capabilities the player needs.
//
// Sandbox was removed because several video providers (JW Player-based embeds,
// ad-supported players) refuse to load inside a sandboxed frame. The `allow`
// attribute is the correct mechanism here — it grants specific capabilities
// without breaking embeds that need scripts and same-origin access.
//
// Defense-in-depth: a MutationObserver scoped to the player container strips
// any <script> or unexpected <iframe> that somehow gets injected (cross-origin
// embeds can't normally do this, but this catches edge cases without watching
// the entire document).

const PLAYER_ALLOW = 'autoplay; fullscreen; picture-in-picture; encrypted-media'

// ── Shortcuts bar — rendered inside the player container ──────────────────────

const VP_LOAD_TIMEOUT = 15000

const VP_SHORTCUTS = [
  { key: 'Space', desc: 'Play/Pause' },
  { key: 'F',     desc: 'Fullscreen' },
  { key: 'M',     desc: 'Mute' },
  { key: '← →',  desc: 'Seek' },
  { key: '?',     desc: 'Help' },
]

const ShortcutsBar = () => (
  <div className="vp-shortcuts-bar" aria-label="Keyboard shortcuts">
    <span className="vp-shortcuts-label">Shortcuts</span>
    {VP_SHORTCUTS.map(({ key, desc }) => (
      <span key={key} className="vp-shortcut-item">
        <kbd className="vp-shortcut-key">{key}</kbd>
        <span className="vp-shortcut-desc">{desc}</span>
      </span>
    ))}
  </div>
)

// ── Component ─────────────────────────────────────────────────────────────────

const VideoPlayer = ({
  tmdbId,
  mediaType = 'movie',   // 'movie' | 'tv'
  season = 1,
  episode = 1,
  title,
  subtitleUrl   = null,
  subtitleLabel = 'English',
  defaultLang   = 'en',
}) => {
  const [activeServer, setActiveServer] = useState(0)
  const [isLoading,    setIsLoading]    = useState(true)
  const [hasError,     setHasError]     = useState(false)
  const wrapRef = useRef(null)
  const observerRef = useRef(null)

  // Strip any <script> or unexpected <iframe> injected into the player
  // container. Cross-origin embeds normally can't do this (same-origin
  // policy), but this is scoped to the container only — not the entire
  // document — so it has zero overhead elsewhere.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations)
        for (const node of addedNodes)
          if (node.tagName === 'SCRIPT' || (node.tagName === 'IFRAME' && !node.classList.contains('vp-iframe')))
            node.remove()
    })
    obs.observe(el, { childList: true, subtree: true })
    observerRef.current = obs
    return () => obs.disconnect()
  }, [])

  // Reset the loading/error state when the server, movie or episode changes —
  // a guarded render-phase update instead of a sync setState inside an effect.
  const playerKey = `${mediaType}:${activeServer}:${tmdbId}:${season}:${episode}`
  const [prevPlayerKey, setPrevPlayerKey] = useState(playerKey)
  if (playerKey !== prevPlayerKey) {
    setPrevPlayerKey(playerKey)
    setIsLoading(true)
    setHasError(false)
  }

  // Mirror isLoading in a ref so the timeout effect always reads the live value.
  const loadingRef = useRef(isLoading)
  useEffect(() => { loadingRef.current = isLoading }, [isLoading])

  // Dead servers: if nothing loads within the grace period, surface the error
  // state so the user is offered a server switch instead of an endless spinner.
  useEffect(() => {
    const t = setTimeout(() => {
      if (loadingRef.current) {
        setIsLoading(false)
        setHasError(true)
      }
    }, VP_LOAD_TIMEOUT)
    return () => clearTimeout(t)
  }, [playerKey])

  const handleServerChange = useCallback((i) => { if (i !== activeServer) setActiveServer(i) }, [activeServer])
  const tryNextServer      = useCallback(() => setActiveServer((s) => (s + 1) % SERVERS.length), [])

  // Keyboard: F = fullscreen
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'f' || e.key === 'F') {
        const iframe = wrapRef.current?.querySelector('iframe')
        if (iframe && document.activeElement !== document.body) return
        if (iframe) {
          const req = iframe.requestFullscreen ?? iframe.webkitRequestFullscreen
          req?.call(iframe)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const current = SERVERS[activeServer]
  const playbackLabel = mediaType === 'tv' ? `S${season}E${episode}` : null
  const playerTitle   = playbackLabel ? `${title} — ${playbackLabel}` : title

  return (
    <div className="vp-container">
      {/* ── Server selector ── */}
      <div className="vp-server-bar">
        <span className="vp-server-label">Stream via:</span>
        <div className="vp-server-tabs" role="group" aria-label="Video servers">
          {SERVERS.map((srv, i) => (
            <button
              key={srv.id}
              onClick={() => handleServerChange(i)}
              className={`vp-server-tab${i === activeServer ? ' vp-server-tab--active' : ''}`}
              aria-pressed={i === activeServer}
              title={`Switch to ${srv.name}`}
            >
              {srv.name}
              {srv.badge && (
                <span className={`vp-server-badge${i === activeServer ? ' vp-server-badge--active' : ''}`}>
                  {srv.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        {/* Quality badge — shown only when this server has a known quality */}
        {current.quality && (
          <span
            className="vp-quality-badge"
            title={`${current.name} typically streams in ${current.quality}`}
          >
            {current.quality}
          </span>
        )}
      </div>

      {/* ── Player ── */}
      <div className="vp-player-wrap" ref={wrapRef}>
        {isLoading && (
          <div className="vp-loading-overlay" aria-live="polite">
            <div className="vp-loading-inner">
              <svg className="vp-spinner" viewBox="0 0 50 50" fill="none" aria-hidden="true">
                <circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <path d="M25 5 A20 20 0 0 1 45 25" stroke="#AB8BFF" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <p className="vp-loading-text">Loading {current.name}…</p>
            </div>
          </div>
        )}

        {hasError && !isLoading && (
          <div className="vp-error-overlay" role="alert">
            <svg className="vp-error-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="vp-error-text">{current.name} is unavailable</p>
            <p className="vp-error-sub">Try switching to another server below</p>
            <button className="vp-retry-btn" onClick={tryNextServer}>Try next server →</button>
          </div>
        )}

        <iframe
          key={playerKey}
          src={current.getUrl({ mediaType, tmdbId, season, episode, subtitleUrl, subtitleLabel, dsLang: defaultLang })}
          title={`${playerTitle} — ${current.name}`}
          className="vp-iframe"
          allow={PLAYER_ALLOW}
          allowFullScreen
          referrerPolicy="origin"
          scrolling="no"
          onLoad={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setHasError(true) }}
        />
      </div>

      {/* ── Hint ── */}
      <p className="vp-hint">
        {mediaType === 'tv'
          ? 'Select an episode to change what plays. If a server doesn\'t load, switch to another.'
          : 'English subtitles are enabled by default where supported. If a server doesn\'t load, switch to another.'}
      </p>

      {/* ── Shortcuts — integrated inside the player container ── */}
      <ShortcutsBar />
    </div>
  )
}

export default VideoPlayer
