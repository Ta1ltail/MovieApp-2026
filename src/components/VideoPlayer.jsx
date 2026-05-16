import { useState, useEffect, useCallback, useRef } from 'react'

// ── Providers ─────────────────────────────────────────────────────────────────

const SERVERS = [
  {
    id:    'vidsrc-ru',
    name:  'VidSrc',
    badge: 'MULTI',
    getUrl: (id, subtitleUrl, dsLang) => {
      let url = `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=jw&title=true&poster=true&autoplay=false&nextbutton=false`
      if (dsLang)      url += `&ds_lang=${dsLang}`
      if (subtitleUrl) url += `&sub_url=${encodeURIComponent(subtitleUrl)}`
      return url
    },
  },
  {
    id:    'vaplayer-ru',
    name:  'VaPlayer',
    badge: 'HD',
    getUrl: (id, subtitleUrl, subtitleLabel = 'English') => {
      let url = `https://vaplayer.ru/embed/movie?tmdb=${id}&autoplay=false`
      if (subtitleUrl) url += `&sub_file=${subtitleUrl}&sub_label=${subtitleLabel}`
      return url
    },
  },
  {
    id:    'vidlink.pro',
    name:  'VidLink',
    badge: 'SUB',
    getUrl: (id) => `https://vidlink.pro/movie/${id}?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&player=jw&title=true&poster=true&autoplay=false&nextbutton=false&tmdb=1`,
  },
  {
    id:    '2embed.cc',
    name:  '2Embed',
    badge: '',
    getUrl: (id) => `https://www.2embed.cc/embed/${id}`,
  },
]

// ── Popup/redirect blocker ─────────────────────────────────────────────────────

const usePopupBlocker = (wrapRef) => {
  useEffect(() => {
    const _open    = window.open
    const _push    = history.pushState.bind(history)
    const _replace = history.replaceState.bind(history)

    window.open = () => null

    try { window.location.assign = window.location.replace = () => {} } catch {}
    try { Object.defineProperty(window, 'top', { get: () => window, configurable: true }) } catch {}

    const isValidPath = (url) => url && String(url).startsWith('/')
    history.pushState    = (...a) => isValidPath(a[2]) && _push(...a)
    history.replaceState = (...a) => isValidPath(a[2]) && _replace(...a)

    const onUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onUnload)

    let lastClick = 0
    const onClickCapture = (e) => {
      const now = Date.now()
      if (now - lastClick > 600) { lastClick = now; e.stopPropagation() }
    }
    wrapRef.current?.addEventListener('click', onClickCapture, true)

    const observer = new MutationObserver((mutations) => {
      for (const { addedNodes } of mutations)
        for (const node of addedNodes)
          if (node.tagName === 'SCRIPT' || (node.tagName === 'IFRAME' && !node.classList.contains('vp-iframe')))
            node.remove()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.open = _open
      history.pushState    = _push
      history.replaceState = _replace
      window.removeEventListener('beforeunload', onUnload)
      wrapRef.current?.removeEventListener('click', onClickCapture, true)
      observer.disconnect()
    }
  }, [])
}

// ── Component ─────────────────────────────────────────────────────────────────

const VideoPlayer = ({ tmdbId, title, subtitleUrl = null, subtitleLabel = 'English' }) => {
  const [activeServer, setActiveServer] = useState(0)
  const [isLoading,    setIsLoading]    = useState(true)
  const [hasError,     setHasError]     = useState(false)
  const wrapRef = useRef(null)

  usePopupBlocker(wrapRef)

  useEffect(() => { setIsLoading(true); setHasError(false) }, [activeServer, tmdbId])

  const handleServerChange = useCallback((i) => { if (i !== activeServer) setActiveServer(i) }, [activeServer])
  const tryNextServer      = useCallback(() => setActiveServer((s) => (s + 1) % SERVERS.length), [])

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

      <p className="vp-hint">
        If a server doesn't load or shows an error, switch to another. Subtitles may vary by provider.
      </p>
    </div>
  )
}

export default VideoPlayer