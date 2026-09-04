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

