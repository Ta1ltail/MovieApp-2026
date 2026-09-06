import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFeatured, getGenreMap, getBackdropUrl, mediaTitle, mediaYear } from '../lib/tmdb'
import { ChevronIcon, PlayIcon, StarIcon } from './icons'

const InfoIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const AUTOPLAY_DELAY = 6000

// Users who ask the OS for reduced motion also shouldn't get an auto-advancing
// hero carousel; the arrows/dots/keys still work.
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const FeaturedCarousel = () => {
  const navigate = useNavigate()
  const [slides, setSlides]     = useState([])
  const [genreMap, setGenreMap] = useState({})
  const [current, setCurrent]   = useState(0)
  const [loading, setLoading]   = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection]     = useState('next')

  const timerRef = useRef(null)
  // Transition timer for goTo — cleared on unmount so a click right before
  // navigating away can't setState on an unmounted component.
  const animTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(animTimerRef.current), [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [movies, gmap] = await Promise.all([
          fetchFeatured(),
          getGenreMap(),
        ])
        if (!cancelled) {
          setSlides(movies)
          setGenreMap(gmap)
          setLoading(false)
        }
      } catch (err) {
        console.error('[FeaturedCarousel] fetch error:', err)
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const goTo = useCallback((index, dir = 'next') => {
    if (isAnimating || slides.length === 0) return
    setDirection(dir)
    setIsAnimating(true)
    setIsPaused(true)
    clearTimeout(animTimerRef.current)
    animTimerRef.current = setTimeout(() => {
      setCurrent(index)
      setIsAnimating(false)
      setIsPaused(false)
    }, 550)
  }, [isAnimating, slides.length, setIsPaused])

  const goNext = useCallback(() => {
    goTo((current + 1) % slides.length, 'next')
  }, [current, slides.length, goTo])

  const goPrev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length, 'prev')
  }, [current, slides.length, goTo])

  useEffect(() => {
    if (isPaused || loading || slides.length === 0 || prefersReducedMotion()) return
    timerRef.current = setInterval(goNext, AUTOPLAY_DELAY)
    return () => clearInterval(timerRef.current)
  }, [isPaused, loading, slides.length, goNext])

  useEffect(() => {
    const onKey = (e) => {
      // Ignore arrow keys while the user is typing (search bar, inputs) —
      // they move the text caret, not the carousel.
      const tag = document.activeElement?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable
      if (isInput) return
      if (e.key === 'ArrowLeft')  goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev])

  const touchStart = useRef(null)
  const onTouchStart = (e) => { touchStart.current = e.touches[0].clientX }
  const onTouchEnd   = (e) => {
    if (touchStart.current === null) return
    const delta = touchStart.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 50) delta > 0 ? goNext() : goPrev()
    touchStart.current = null
  }

  if (loading) {
    return (
      <div className="carousel-skeleton" aria-busy="true" aria-label="Loading featured movies">
        <div className="carousel-skeleton-pulse" />
        <div className="carousel-skeleton-content">
          <div className="carousel-skeleton-bar" style={{ width: '12rem', height: '0.75rem', marginBottom: '0.75rem' }} />
          <div className="carousel-skeleton-bar" style={{ width: '18rem', height: '2rem', marginBottom: '1rem' }} />
          <div className="carousel-skeleton-bar" style={{ width: '100%', height: '0.75rem', marginBottom: '0.5rem' }} />
          <div className="carousel-skeleton-bar" style={{ width: '80%', height: '0.75rem', marginBottom: '1.5rem' }} />
          <div className="carousel-skeleton-btns">
            <div className="carousel-skeleton-bar" style={{ width: '8rem', height: '2.75rem', borderRadius: '999px' }} />
            <div className="carousel-skeleton-bar" style={{ width: '7rem', height: '2.75rem', borderRadius: '999px' }} />
          </div>
        </div>
      </div>
    )
  }

  if (slides.length === 0) return null

  const slide = slides[current]
  const isTv  = slide.media_type === 'tv'
  const title = mediaTitle(slide)
  const year  = mediaYear(slide) ?? ''
  const rating = slide.vote_average?.toFixed(1) ?? 'N/A'
  const genreNames = (slide.genre_ids ?? [])
    .slice(0, 3)
    .map(id => genreMap[id])
    .filter(Boolean)
  const detailsPath = `/${isTv ? 'tv' : 'movie'}/${slide.id}`

  return (
    <section
      className="carousel"
      aria-label="Featured movies and TV series"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Backdrop ── */}
      <div className="carousel-backdrop" aria-hidden="true">
        {slides.map((s, i) => (
          <img
            key={`${s.media_type ?? 'movie'}-${s.id}`}
            src={getBackdropUrl(s.backdrop_path, 'w1280')}
            srcSet={`${getBackdropUrl(s.backdrop_path, 'w780')} 780w, ${getBackdropUrl(s.backdrop_path, 'w1280')} 1280w, ${getBackdropUrl(s.backdrop_path, 'original')} 1920w`}
            sizes="100vw"
            alt=""
            className={`carousel-backdrop-img ${i === current ? 'carousel-backdrop-img--active' : ''}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ))}
        <div className="carousel-gradient-overlay" />
        <div className="carousel-gradient-bottom" />
        <div className="carousel-gradient-left" />
      </div>

      {/* ── Content ── */}
      <div
        key={`${slide.media_type}-${slide.id}`}
        className={`carousel-content ${isAnimating ? `carousel-content--exit-${direction}` : 'carousel-content--enter'}`}
      >
        <div className="carousel-inner">
          <div className="carousel-meta">
            <span className="carousel-rating" aria-label={`Rating: ${rating}`}>
              <StarIcon size={14} />
              <span>{rating}</span>
            </span>
            {year && <span className="carousel-dot" aria-hidden="true">•</span>}
            {year && <span className="carousel-year">{year}</span>}
            <span className="carousel-dot" aria-hidden="true">•</span>
            <span className="carousel-type-label">{isTv ? 'TV Series' : 'Movie'}</span>
          </div>

          <h1 className="carousel-title">{title}</h1>

          {genreNames.length > 0 && (
            <div className="carousel-genres" aria-label="Genres">
              {genreNames.map(name => (
                <span key={name} className="carousel-genre-pill">{name}</span>
              ))}
            </div>
          )}

          {slide.overview && (
            <p className="carousel-overview">{slide.overview}</p>
          )}

          <div className="carousel-actions">
            <button
              className="carousel-btn carousel-btn--primary"
              onClick={() => navigate(detailsPath)}
              aria-label={`Watch ${title} now`}
            >
              <PlayIcon size={18} />
              Watch Now
            </button>
            <button
              className="carousel-btn carousel-btn--secondary"
              onClick={() => navigate(detailsPath)}
              aria-label={`View details for ${title}`}
            >
              <InfoIcon />
              Details
            </button>
          </div>
        </div>
      </div>

      {/* ── Navigation arrows ── */}
      <button className="carousel-arrow carousel-arrow--left" onClick={goPrev} aria-label="Previous">
        <ChevronIcon size={24} dir="left" />
      </button>
      <button className="carousel-arrow carousel-arrow--right" onClick={goNext} aria-label="Next">
        <ChevronIcon size={24} />
      </button>

      {/* ── Dot indicators ── */}
      <div className="carousel-dots" role="tablist" aria-label="Slide navigation">
        {slides.map((s, i) => (
          <button
            key={`${s.media_type}-${s.id}`}
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}: ${mediaTitle(s)}`}
            className={`carousel-dot-btn ${i === current ? 'carousel-dot-btn--active' : ''}`}
            onClick={() => goTo(i, i > current ? 'next' : 'prev')}
          >
            {i === current && !isPaused && (
              <span
                className="carousel-dot-progress"
                style={{ animationDuration: `${AUTOPLAY_DELAY}ms` }}
              />
            )}
          </button>
        ))}
      </div>
    </section>
  )
}

export default FeaturedCarousel
