export const EmptyState = ({ searchTerm, onClear }) => (
  <div className="empty-state" role="status">
    <div className="empty-state-icon" aria-hidden="true">🎬</div>
    <h3 className="empty-state-title">No movies found</h3>
    <p className="empty-state-text">
      {searchTerm
        ? `No results for "${searchTerm}". Try a different keyword.`
        : 'No movies match your current filters. Try adjusting or resetting them.'}
    </p>
    <button className="empty-state-btn" onClick={onClear}>
      {searchTerm ? 'Clear search' : 'Reset filters'}
    </button>
  </div>
)

export const ErrorState = ({ message, onRetry }) => (
  <div className="error-state" role="alert">
    <div className="error-state-icon" aria-hidden="true">⚠️</div>
    <h3 className="error-state-title">Something went wrong</h3>
    <p className="error-state-text">{message}</p>
    <button className="error-state-btn" onClick={onRetry}>
      Try again
    </button>
  </div>
)