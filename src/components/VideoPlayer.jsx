import { useState, useRef, useEffect, useCallback } from 'react'

const SERVERS = [
  {
    id:    'vidsrc-ru',
    name:  'VidSrc',
    badge: 'MULTI',
    getUrl: (id, subtitleUrl, dsLang = 'en') => {
      let url = `https://vidsrc-embed.ru/embed/movie?tmdb=${id}&primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&title=true&poster=true&autoplay=false&nextbutton=false&ds_lang=${dsLang}&touch=0&controls=true`
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
    getUrl: (id) =>
      `https://vidlink.pro/movie/${id}?primaryColor=63b8bc&secondaryColor=a2a2a2&iconColor=eefdec&icons=default&title=true&poster=true&autoplay=false&nextbutton=false&tmdb=1&defaultSubtitle=en`
  },
  {
    id:    '2embed.cc',
    name:  '2Embed',
    badge: '',
    getUrl: (id) => `https://www.2embed.cc/embed/${id}`,
  },
]

// ── Popup/redirect blocker ─────────────────────────────────────────────────────

// ── Popup/redirect blocker ─────────────────────────────────────────────────────
const usePopupBlocker = () => {
  useEffect(() => {
    const _open    = window.open
    const _push    = history.pushState.bind(history)
    const _replace = history.replaceState.bind(history)

    window.open = () => null

    try { window.location.assign = window.location.replace = () => {} } catch {}
    
    const isValidPath = (url) => url && String(url).startsWith('/')
    history.pushState    = (...a) => { if (isValidPath(a[2])) _push(...a) }
    history.replaceState = (...a) => { if (isValidPath(a[2])) _replace(...a) }

    const onUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onUnload)

    const observer = new MutationObserver((mutations) => {
      for (const { addedNodes, target } of mutations) {
        // only act on direct body children, not inside iframes
        if (target !== document.body) continue
        for (const node of addedNodes) {
          if (
            node.nodeType !== 1 ||
            node.classList?.contains('vp-iframe')
          ) continue
          if (
            node.tagName === 'SCRIPT' ||
            node.tagName === 'IFRAME'
          ) node.remove()
        }
      }
    })
    observer.observe(document.body, { childList: true })

    return () => {
      window.open = _open
      history.pushState    = _push
      history.replaceState = _replace
      window.removeEventListener('beforeunload', onUnload)
      observer.disconnect()
    }
  }, [])
}

// ── Shortcuts bar — rendered inside the player container ──────────────────────

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
  title,
  subtitleUrl   = null,
  subtitleLabel = 'English',
  defaultLang   = 'en',
}) => {
  const [activeServer, setActiveServer] = useState(0)
  const [isLoading,    setIsLoading]    = useState(true)
  const [hasError,     setHasError]     = useState(false)
  const wrapRef = useRef(null)

  usePopupBlocker()

  useEffect(() => { setIsLoading(true); setHasError(false) }, [activeServer, tmdbId])

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
          src={current.getUrl(tmdbId, subtitleUrl, subtitleLabel || defaultLang)}
          title={`${title} — ${current.name}`}
          className="vp-iframe"
          onLoad={() => setIsLoading(false)}
          onError={() => { setIsLoading(false); setHasError(true) }}

          // ✅ expanded permissions — pointer-lock lets JW Player properly
          //    capture mouse for fullscreen; display-capture, gyroscope help
          //    with responsive player detection
          allow="autoplay; fullscreen *; picture-in-picture *; encrypted-media; pointer-lock *; display-capture *; gyroscope *; accelerometer *"
          allowFullScreen

          // ✅ CHANGED: "origin" strips the path and can trigger restricted
          //    mode on some embed providers. "no-referrer-when-downgrade"
          //    sends the full URL which VidSrc expects for whitelisting
          referrerPolicy="no-referrer-when-downgrade"

          // ✅ REMOVED: scrolling="no" — deprecated attribute, can interfere
          //    with internal player scroll handling on some browsers
        />
      </div>

      {/* ── Hint ── */}
      <p className="vp-hint">
        English subtitles are enabled by default where supported. If a server doesn't load, switch to another.
      </p>

      {/* ── Shortcuts — integrated inside the player container ── */}
      <ShortcutsBar />
    </div>
  )
}

export default VideoPlayer