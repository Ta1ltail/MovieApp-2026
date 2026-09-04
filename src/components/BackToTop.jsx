import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ChevronUpIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth="2.5"
    stroke="currentColor"
    width="20"
    height="20"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
)

const BackToTop = () => {
  const location = useLocation()
  const isHome = location.pathname === '/'
  const [visible, setVisible] = useState(() => isHome && window.scrollY > 400)
  const [prevIsHome, setPrevIsHome] = useState(isHome)

  // Sync visibility when navigating between home and other pages — a guarded
  // render-phase update instead of a sync setState inside an effect.
  if (prevIsHome !== isHome) {
    setPrevIsHome(isHome)
    setVisible(isHome && window.scrollY > 400)
  }

  useEffect(() => {
    if (!isHome) return
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome])

  if (!isHome || !visible) return null

  return (
    <button
      className="back-to-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      title="Back to top"
    >
      <ChevronUpIcon />
    </button>
  )
}

export default BackToTop