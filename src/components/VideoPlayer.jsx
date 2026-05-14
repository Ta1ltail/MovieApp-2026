import { useState, useEffect, useCallback } from 'react'

// ── Servers ──────────────────────────────────────────────────────────────────
// Each entry is a distinct provider — no duplicate brands/domains.
const SERVERS = [
  {
    id: 'vidsrc-cc',
    name: 'VidSrc',
    badge: 'HD',
    getUrl: (id) => `https://vidsrc.cc/v2/embed/movie/${id}`,
  },
  {
    id: '2embed',
    name: '2Embed',
    badge: 'SUB',
    getUrl: (id) => `https://www.2embed.stream/embed/movie/${id}`,
  },
  {
    id: 'vidlink',
    name: 'VidLink',
    badge: '',
    getUrl: (id) => `https://vidlink.pro/movie/${id}`,
  },
  {
    id: 'multiembed',
    name: 'MultiEmbed',
    badge: 'MULTI',
    getUrl: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  },
]

// ── Popup / redirect blocker ──────────────────────────────────────────────────
const usePopupBlocker = () => {
  useEffect(() => {
    const _open = window.open
    window.open = (...args) => {
      console.warn('[VideoPlayer] Blocked popup:', args[0])
      return null
    }

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    const _push = history.pushState.bind(history)
    const _replace = history.replaceState.bind(history)
    history.pushState = (...args) => {
      if (args[2] && String(args[2]).startsWith('/')) return _push(...args)
      console.warn('[VideoPlayer] Blocked pushState:', args[2])
    }
    history.replaceState = (...args) => {
      if (args[2] && String(args[2]).startsWith('/')) return _replace(...args)
      console.warn('[VideoPlayer] Blocked replaceState:', args[2])
    }

    return () => {
      window.open = _open
      window.removeEventListener('beforeunload', handleBeforeUnload)
      history.pushState = _push
      history.replaceState = _replace
    }
  }, [])
}

// ── Component ─────────────────────────────────────────────────────────────────
const VideoPlayer = ({ tmdbId, title }) => {
  const [activeServer, setActiveServer] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  usePopupBlocker()

  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [activeServer, tmdbId])

  const handleServerChange = useCallback((i) => {
    if (i !== activeServer) setActiveServer(i)
  }, [activeServer])

  const tryNextServer = useCallback(() => {
    const next = (activeServer + 1) % SERVERS.length
    setActiveServer(next)
  }, [activeServer])

  const current = SERVERS[activeServer]

  return (
    <div className="vp-container">

      {/* ── Server bar ── */}
      <div className="vp-server-bar">
        <span className="vp-server-label">Stream via:</span>
        <div className="vp-server-tabs">
          {SERVERS.map((srv, i) => (
            <button
              key={srv.id}
              onClick={() => handleServerChange(i)}
              className={`vp-server-tab${i === activeServer ? ' vp-server-tab--active' : ''}`}
              aria-pressed={i === activeServer}
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
      </div>

      {/* ── Player wrap ── */}
      <div className="vp-player-wrap">

        {/* Loading overlay */}
        {isLoading && (
          <div className="vp-loading-overlay">
            <div className="vp-loading-inner">
              <svg className="vp-spinner" viewBox="0 0 50 50" fill="none" aria-hidden="true">
                <circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                <path d="M25 5 A20 20 0 0 1 45 25" stroke="#AB8BFF" strokeWidth="4" strokeLinecap="round" />
              </svg>
              <p className="vp-loading-text">Loading {current.name}…</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {hasError && !isLoading && (
          <div className="vp-error-overlay">
            <svg className="vp-error-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="vp-error-text">{current.name} is unavailable</p>
            <p className="vp-error-sub">Switch to another server or try again</p>
            <button className="vp-retry-btn" onClick={tryNextServer}>
              Try next server →
            </button>
          </div>
        )}

        <iframe
          key={`${activeServer}-${tmdbId}`}
          src={current.getUrl(tmdbId)}
          title={`${title} — ${current.name}`}
          className="vp-iframe"
          onLoad={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setHasError(true) }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
        />
      </div>

      {/* ── Footer hint ── */}
      <p className="vp-hint">
        If a server doesn't load or subtitles are off, try switching to another.
      </p>
    </div>
  )
}

export default VideoPlayer