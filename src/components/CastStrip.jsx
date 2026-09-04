import { useRef, useState, useCallback, useEffect } from 'react'
import { getProfileUrl } from '../lib/tmdb'
import { ChevronIcon } from './icons'

const ScrollButtons = ({ onScroll, showLeft, showRight }) => {
  if (!showLeft && !showRight) return null
  return (
    <div className="cast-nav" role="group" aria-label="Scroll through cast">
      <button
        type="button"
        className="cast-nav-btn"
        onClick={() => onScroll('left')}
        disabled={!showLeft}
        aria-label="See previous cast members"
      >
        <ChevronIcon size={18} dir="left" />
      </button>
      <button
        type="button"
        className="cast-nav-btn"
        onClick={() => onScroll('right')}
        disabled={!showRight}
        aria-label="See more cast members"
      >
        <ChevronIcon size={18} />
      </button>
    </div>
  )
}

/**
 * CastStrip — horizontally scrollable cast row with slide buttons.
 * All credited cast with a photo are included; the row scrolls in place
 * (never navigates away or hides members) on desktop and mobile.
 */
const CastStrip = ({ cast = [] }) => {
  const stripRef = useRef(null)
  const [canScrollLeft,  setCanScrollLeft]  = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const people = Array.isArray(cast)
    ? cast.filter(m => m.profile_path)
    : []

  const updateArrows = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < maxScroll - 4)
  }, [])

  useEffect(() => {
    // Measure after paint (deferred so no synchronous setState inside effect).
    const raf = requestAnimationFrame(updateArrows)
    const ro = new ResizeObserver(() => updateArrows())
    if (stripRef.current) ro.observe(stripRef.current)
    window.addEventListener('resize', updateArrows)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, people.length])

  const scrollByDir = useCallback((dir) => {
    const el = stripRef.current
    if (!el) return
    const amount = Math.max(320, el.clientWidth * 0.85)
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  if (people.length === 0) return null

  return (
    <section className="cast-section" aria-label="Cast">
      <div className="cast-heading-row">
        <h2 className="details-player-heading">Cast</h2>
        <ScrollButtons onScroll={scrollByDir} showLeft={canScrollLeft} showRight={canScrollRight} />
      </div>
      <div
        className="cast-strip"
        ref={stripRef}
        onScroll={updateArrows}
      >
        {people.map(person => (
          <div key={person.id} className="cast-card" title={person.name}>
            <div className="cast-photo-wrap">
              <img
                src={getProfileUrl(person.profile_path)}
                alt={person.name}
                className="cast-photo"
                loading="lazy"
                decoding="async"
              />
            </div>
            <p className="cast-name">{person.name}</p>
            <p className="cast-character">{person.character}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default CastStrip
