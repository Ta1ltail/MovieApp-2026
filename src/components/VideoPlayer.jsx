import { useState, useEffect, useCallback } from 'react'

// ── Providers ─────────────────────────────────────────────────────────────────

const SERVERS = [
  {
    id:    'vidsrc-ru',
    name:  'VidSrc',
    badge: 'MULTI',
    getUrl: (id, subtitleUrl = null, dsLang = null) => {
      let url = `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&autoplay=1`;
      if (dsLang)      url += `&ds_lang=${dsLang}`;
      if (subtitleUrl) url += `&sub_url=${encodeURIComponent(subtitleUrl)}`;
      return url;
    },
  },
  {
    id: 'vidlink',
    name: 'VidLink',
    badge: 'HD',
    getUrl: (id, subtitleUrl = null, subtitleLabel = 'English') => {
      let url = `https://vidlink.pro/movie/${id}?primaryColor=AB8BFF&secondaryColor=030014&autoplay=true`;
      if (subtitleUrl) {
        url += `&sub_file=${subtitleUrl}&sub_label=${subtitleLabel}`;
      }
      return url;
    },
  },
  {
    id:    'superembed',
    name:  'SuperEmbed',
    badge: 'SUB',
    getUrl: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
  },
  {
    id:    '2embed',
    name:  '2Embed',
    badge: '',
    getUrl: (id) => `https://www.2embed.cc/embed/${id}`,
  },
]

// ── Popup/redirect blocker ─────────────────────────────────────────────────────
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

    const _push    = history.pushState.bind(history)
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
      history.pushState    = _push
      history.replaceState = _replace
    }
  }, [])
}

// ── Component ─────────────────────────────────────────────────────────────────
const VideoPlayer = ({ tmdbId, title, subtitleUrl = null, subtitleLabel = 'English' }) => {
  const [activeServer, setActiveServer] = useState(0)
  const [isLoading,    setIsLoading]    = useState(true)
  const [hasError,     setHasError]     = useState(false)

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
      </div>

      {/* ── Player ── */}
      <div className="vp-player-wrap">

        {/* Loading overlay */}
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

        {/* Error overlay */}
        {hasError && !isLoading && (
          <div className="vp-error-overlay" role="alert">
            <svg className="vp-error-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#f87171" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="vp-error-text">{current.name} is unavailable</p>
            <p className="vp-error-sub">Try switching to another server below</p>
            <button className="vp-retry-btn" onClick={tryNextServer}>
              Try next server →
            </button>
          </div>
        )}

        {/* ── Iframe ── */}
        <iframe
          key={`${activeServer}-${tmdbId}`}
          src={current.getUrl(tmdbId, subtitleUrl, subtitleLabel)}
          title={`${title} — ${current.name}`}
          className="vp-iframe"
          onLoad={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setHasError(true) }}
          allow="autoplay; fullscreen *; picture-in-picture *; encrypted-media"
          allowFullScreen
          referrerPolicy="origin"
          scrolling="no"
        />
      </div>

      {/* ── Footer hint ── */}
      <p className="vp-hint">
        If a server doesn't load or shows an error, switch to another. Subtitles may vary by provider.
      </p>
    </div>
  )
}

export default VideoPlayer