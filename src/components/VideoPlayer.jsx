import { useState, useRef, useEffect, useCallback } from 'react'

// Each server builds an embed URL for a movie or a TV episode.
// Movie URLs are unchanged from previous versions.
//
// `quality` is the stream quality these embed services are documented to
// typically serve ('HD' / 'SD'). It's a provider-level default — an embed
// can't be probed for its actual resolution — so servers with no stable
// known quality (e.g. 2Embed, which mixes sources) leave it out and the
// badge simply doesn't appear instead of guessing.
//
// `preferWrapperFullscreen` marks providers whose embeds run JW Player (or
// similar) internally. These players intercept fullscreen requests made
// from the parent page against the <iframe> element itself and silently
// ignore them — `iframe.requestFullscreen()` resolves (or is a no-op)
// without ever actually entering fullscreen. For these, we skip the
// iframe-level attempt entirely and fullscreen the wrapper <div> instead,
// which reliably works because it doesn't depend on the embed cooperating.
const SERVERS = [
  {
    id:      'vidsrc-ru',
    name:    'VidSrc',
    badge:   'MULTI',
    quality: 'HD',
    preferWrapperFullscreen: true,
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
    preferWrapperFullscreen: true,
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
    preferWrapperFullscreen: true,
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
      if (mediaType === 'tv') return `https://www.2embed.cc/embedtv/${tmdbId}?s=${season}&e=${episode}`
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

// Fullscreen toggle icons (filled corner-arrow glyphs, Material-style).
const ExpandIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="15" height="15">
    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
  </svg>
)
const CompressIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="15" height="15">
    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
  </svg>
)

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

// ── Fullscreen helper ───────────────────────────────────────────────────────
// Centralizes the "try iframe, verify it actually worked, else fall back to
// the wrapper" logic so the keyboard shortcut and the button stay in sync
// and neither one trusts a `requestFullscreen()` call that silently did
// nothing.
//
// Why the old version was broken: `iframe.requestFullscreen` exists as a
// method on virtually every iframe in modern browsers, so the old
// `if (iframeReq)` check was almost always true regardless of whether the
// *provider's own player* would actually honor it. `requestFullscreen()`
// returns a Promise — a provider that ignores/blocks it typically resolves
// (or silently no-ops) rather than throwing synchronously, so the old
// try/catch never caught anything, and the function `return`ed immediately
// having never confirmed fullscreen actually happened.
async function requestPlayerFullscreen(wrapEl, server) {
  if (!wrapEl) return

  // Already fullscreen (on the wrapper or something inside it) → toggle back
  // out. Without this, the button labeled "Exit fullscreen" and the F key
  // were silent no-ops while fullscreen, since re-requesting fullscreen on
  // the same element does nothing.
  const fsEl = document.fullscreenElement ?? document.webkitFullscreenElement
  if (fsEl && (fsEl === wrapEl || wrapEl.contains(fsEl))) {
    const exit = document.exitFullscreen ?? document.webkitExitFullscreen
    try { await exit?.call(document) } catch { /* already exiting */ }
    return
  }

  const iframe = wrapEl.querySelector('iframe')
  const tryFullscreen = (el) => {
    if (!el) return Promise.reject(new Error('no element'))
    const req = el.requestFullscreen ?? el.webkitRequestFullscreen
    if (!req) return Promise.reject(new Error('unsupported'))
    return req.call(el)
  }

  // Hide loader/error overlays before attempting so the player's own UI
  // (or the wrapper) is what the user sees once fullscreen lands.
  const overlays = wrapEl.querySelectorAll('.vp-loading-overlay, .vp-error-overlay')
  overlays.forEach((o) => { o.style.display = 'none' })

  const restoreOverlays = () => overlays.forEach((o) => { o.style.display = '' })

  // Known JW-Player-style providers ignore iframe-level fullscreen — don't
  // waste the attempt, go straight to the wrapper.
  if (!server?.preferWrapperFullscreen && iframe) {
    try {
      await tryFullscreen(iframe)
      // Verify it actually landed on the iframe. If the provider silently
      // swallowed the request, document.fullscreenElement won't be it.
      if (document.fullscreenElement === iframe) return
    } catch {
      // fall through to wrapper
    }
  }

  try {
    await tryFullscreen(wrapEl)
  } catch {
    restoreOverlays()
  }
}

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
  const [isFullscreen, setIsFullscreen] = useState(false)

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

  // Hide/show the loader + error overlays depending on load state. We keep
  // them on screen by default so fullscreen can temporarily hide them without
  // permanently removing them from the DOM.
  const isLoadingOrError = isLoading || (hasError && !isLoading)
  const shouldHideOverlays = isFullscreen

  const handleServerChange = useCallback((i) => { if (i !== activeServer) setActiveServer(i) }, [activeServer])
  const tryNextServer      = useCallback(() => setActiveServer((s) => (s + 1) % SERVERS.length), [])

  // Fullscreen state must be tracked at the document level, not via a prop
  // on the <iframe>. `fullscreenchange` fires on whichever element actually
  // entered fullscreen — for `preferWrapperFullscreen` providers that's the
  // wrapper <div>, not the iframe — and it only bubbles UP to ancestors, so
  // a listener on the iframe (a descendant of the wrapper) never sees it.
  // Listening on `document` catches the event regardless of which element
  // (iframe or wrapper) was actually fullscreened.
  useEffect(() => {
    const handleFsChange = () => {
      const wrap = wrapRef.current
      const fsEl = document.fullscreenElement
      const wentFull = !!fsEl && !!wrap && (fsEl === wrap || wrap.contains(fsEl))
      setIsFullscreen(wentFull)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange) // Safari
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
    }
  }, [])

  // Keyboard: F = fullscreen.
  //
  // Note on scope: this listener is attached to `window`, but once the user
  // clicks into a cross-origin iframe, that iframe's *own document* has
  // focus and keydown events fire there instead — they don't bubble up to
  // the parent window. So pressing F while focus is inside the embed is
  // handled entirely by the provider's own player (e.g. JW Player's native
  // fullscreen shortcut), not by this handler. This listener only fires
  // when focus is still on the parent page (e.g. right after the page
  // loads, before the user has clicked into the player).
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onKey = (e) => {
      if (e.key !== 'f' && e.key !== 'F') return
      const target = document.activeElement
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable) return
      requestPlayerFullscreen(wrapRef.current, SERVERS[activeServer])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeServer])

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
      <div className={`vp-player-wrap${isFullscreen ? ' vp-fullscreen-active' : ''}`} ref={wrapRef} data-vp-fullscreen={isFullscreen ? 'true' : 'false'}>
        {/* Fullscreen-toggling button lives inside the wrapper so it stays
              anchored to the video area and remains clickable while the
              wrapper itself is fullscreen (overlays are hidden then). */}
        <button
          className="vp-fullscreen-btn"
          title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          onClick={() => requestPlayerFullscreen(wrapRef.current, current)}
        >
          {isFullscreen ? <CompressIcon /> : <ExpandIcon />}
        </button>
        {isLoadingOrError && (
          <div className={`vp-loading-overlay${shouldHideOverlays ? ' vp-hidden' : ''}`} aria-live="polite">
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
          <div className={`vp-error-overlay${shouldHideOverlays ? ' vp-hidden' : ''}`} role="alert">
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

      {!shouldHideOverlays && (
        <>
          {/* Hint ── */}
          <p className="vp-hint">
            {mediaType === 'tv'
              ? 'Select an episode to change what plays. If a server doesn\'t load, switch to another.'
              : 'English subtitles are enabled by default where supported. If a server doesn\'t load, switch to another.'}
          </p>

          {/* ── Shortcuts — integrated inside the player container ── */}
          <ShortcutsBar />
        </>
      )}
    </div>
  )
}

export default VideoPlayer