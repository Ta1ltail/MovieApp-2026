import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFeaturedMovies, getGenreMap, getBackdropUrl } from '../lib/tmdb'

const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f5c518" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const ChevronLeft = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const ChevronRight = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M5 3l14 9-14 9V3z" />
  </svg>
)

const InfoIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
    <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
)

const AUTOPLAY_DELAY = 6000

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
  const trackRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [movies, gmap] = await Promise.all([
          fetchFeaturedMovies(),
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
    setTimeout(() => {
      setCurrent(index)
      setIsAnimating(false)
    }, 550)
  }, [isAnimating, slides.length])

  const goNext = useCallback(() => {
    goTo((current + 1) % slides.length, 'next')
  }, [current, slides.length, goTo])

  const goPrev = useCallback(() => {
    goTo((current - 1 + slides.length) % slides.length, 'prev')
  }, [current, slides.length, goTo])

  useEffect(() => {
    if (isPaused || loading || slides.length === 0) return
    timerRef.current = setInterval(goNext, AUTOPLAY_DELAY)
    return () => clearInterval(timerRef.current)
  }, [isPaused, loading, slides.length, goNext])

  useEffect(() => {
    const onKey = (e) => {
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
  const year = slide.release_date?.split('-')[0] ?? ''
  const rating = slide.vote_average?.toFixed(1) ?? 'N/A'
  const genreNames = (slide.genre_ids ?? [])
    .slice(0, 3)
    .map(id => genreMap[id])
    .filter(Boolean)

  return (
    <section
      className="carousel"
      aria-label="Featured movies"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      ref={trackRef}
    >
      {/* ── Backdrop ── */}
      <div className="carousel-backdrop" aria-hidden="true">
        {slides.map((s, i) => (
          <img
            key={s.id}
            src={getBackdropUrl(s.backdrop_path, 'original')}
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
        key={slide.id}
        className={`carousel-content ${isAnimating ? `carousel-content--exit-${direction}` : 'carousel-content--enter'}`}
      >
        <div className="carousel-inner">
          <div className="carousel-meta">
            <span className="carousel-rating" aria-label={`Rating: ${rating}`}>
              <StarIcon />
              <span>{rating}</span>
            </span>
            {year && <span className="carousel-dot" aria-hidden="true">•</span>}
            {year && <span className="carousel-year">{year}</span>}
          </div>

          <h1 className="carousel-title">{slide.title}</h1>

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
              onClick={() => navigate(`/movie/${slide.id}`)}
              aria-label={`Watch ${slide.title} now`}
            >
              <PlayIcon />
              Watch Now
            </button>
            <button
              className="carousel-btn carousel-btn--secondary"
              onClick={() => navigate(`/movie/${slide.id}`)}
              aria-label={`View details for ${slide.title}`}
            >
              <InfoIcon />
              Details
            </button>
          </div>
        </div>
      </div>

      {/* ── Navigation arrows ── */}
      <button className="carousel-arrow carousel-arrow--left" onClick={goPrev} aria-label="Previous movie">
        <ChevronLeft />
      </button>
      <button className="carousel-arrow carousel-arrow--right" onClick={goNext} aria-label="Next movie">
        <ChevronRight />
      </button>

      {/* ── Dot indicators — NO slide counter ── */}
      <div className="carousel-dots" role="tablist" aria-label="Slide navigation">
        {slides.map((s, i) => (
          <button
            key={s.id}
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}: ${s.title}`}
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

      {/* Slide counter REMOVED as requested */}
    </section>
  )
}

export default FeaturedCarousel