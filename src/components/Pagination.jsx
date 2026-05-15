const MAX_VISIBLE = 5

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null

  const getPages = () => {
    if (totalPages <= MAX_VISIBLE) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const half = Math.floor(MAX_VISIBLE / 2)
    let start = Math.max(1, page - half)
    let end = Math.min(totalPages, start + MAX_VISIBLE - 1)
    if (end - start < MAX_VISIBLE - 1) start = Math.max(1, end - MAX_VISIBLE + 1)
    const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)
    if (start > 1) pages.unshift('…start')
    if (end < totalPages) pages.push('…end')
    return pages
  }

  const pages = getPages()

  return (
    <nav className="pagination" aria-label="Movie list pagination" role="navigation">
      {/* Prev */}
      <button
        className="pagination-btn pagination-btn--arrow"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        ‹
      </button>

      {/* Page numbers */}
      {pages.map((p, i) => {
        if (typeof p === 'string') {
          // ellipsis — jump to logical target
          const target = p === '…start' ? 1 : totalPages
          return (
            <button
              key={p}
              className="pagination-btn pagination-btn--ellipsis"
              onClick={() => onPageChange(target)}
              aria-label={`Jump to page ${target}`}
            >
              …
            </button>
          )
        }
        return (
          <button
            key={p}
            className={`pagination-btn ${p === page ? 'pagination-btn--active' : ''}`}
            onClick={() => onPageChange(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      })}

      {/* Next */}
      <button
        className="pagination-btn pagination-btn--arrow"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Next page"
      >
        ›
      </button>

      {/* Page info */}
      <span className="pagination-info">
        Page {page} of {totalPages.toLocaleString()}
      </span>
    </nav>
  )
}

export default Pagination