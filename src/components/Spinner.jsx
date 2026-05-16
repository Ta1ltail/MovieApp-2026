export const SkeletonCard = () => (
  <div className="skeleton-card" aria-hidden="true">
    <div className="skeleton-poster skeleton-pulse" />
    <div className="skeleton-info">
      <div className="skeleton-title skeleton-pulse" />
      <div className="skeleton-meta skeleton-pulse" />
    </div>
  </div>
)

export const SkeletonGrid = ({ count = 20 }) => (
  <ul className="movies-grid" aria-busy="true" aria-label="Loading movies…">
    {Array.from({ length: count }, (_, i) => (
      <li key={i}><SkeletonCard /></li>
    ))}
  </ul>
)

const Spinner = ({ size = 32 }) => (
  <div role="status" aria-label="Loading" className="spinner-wrap">
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      className="spinner-svg"
      aria-hidden="true"
    >
      <circle cx="25" cy="25" r="20" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <path d="M25 5 A20 20 0 0 1 45 25" stroke="#AB8BFF" strokeWidth="4" strokeLinecap="round" />
    </svg>
    <span className="sr-only">Loading…</span>
  </div>
)

export default Spinner

