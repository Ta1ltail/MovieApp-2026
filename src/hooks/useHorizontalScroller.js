import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * useHorizontalScroller — shared logic for horizontal "carousel" rows with
 * Previous / Next slide buttons (Cast strip, Seasons strip, …).
 *
 * Owns three things:
 *   1. Arrow state  — canScrollLeft / canScrollRight, updated on scroll,
 *      resize and content changes (via ResizeObserver), so buttons can
 *      disable themselves at either end of the row.
 *   2. Scrolling    — scrollByDir('left' | 'right') slides the row by most
 *      of a viewport width with smooth behavior.
 *   3. Live updates — updateArrows, for onScroll bindings, so the arrow
 *      state tracks manual/drag/touch scrolling of the row.
 *   4. Padding      — source list length, so arrow updates re-run when the
 *      number of items changes.
 *
 * Selection is deliberately NOT part of this hook: buttons that slide the row
 * must never change which item is selected (Seasons) — that stays with the
 * caller.
 */
const useHorizontalScroller = (itemCount = 0) => {
  const stripRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    // Small tolerance so sub-pixel scroll positions don't leave buttons enabled.
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < maxScroll - 4)
  }, [])

  useEffect(() => {
    // Measure after paint (deferred so no synchronous setState inside effect).
    const raf = requestAnimationFrame(updateArrows)
    const ro = new ResizeObserver(updateArrows)
    if (stripRef.current) ro.observe(stripRef.current)
    window.addEventListener('resize', updateArrows)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, itemCount])

  const scrollByDir = useCallback((dir) => {
    const el = stripRef.current
    if (!el) return
    const amount = Math.max(320, el.clientWidth * 0.85)
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }, [])

  return { stripRef, canScrollLeft, canScrollRight, scrollByDir, updateArrows }
}

export default useHorizontalScroller
