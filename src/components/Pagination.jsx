import { buildPages } from '../lib/utils'

const Pagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null

  const pages = buildPages(page, totalPages)

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
      {pages.map((p) => {
        if (typeof p === 'string') {
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
    </nav>
  )
}

export default Pagination