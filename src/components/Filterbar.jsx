/**
 * components/FilterBar.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Netflix-style filter system:
 *   • Horizontal category tabs (scrollable)
 *   • "Filters" pill button showing active count
 *   • Active filter chips with × dismiss
 *   • Collapsible panel: Genre / Year / Min Rating / Cast
 *   • Apply Filters + Reset All buttons
 */

import { useState, useCallback, useMemo } from 'react'
import { CATEGORIES } from '../lib/tmdb'

// ── Constants ─────────────────────────────────────────────────────────────────
const YEARS = (() => {
  const cur = new Date().getFullYear()
  return Array.from({ length: 35 }, (_, i) => cur - i)
})()

const RATINGS = [
  { value: '',  label: 'Any Rating' },
  { value: '9', label: '9+ ★' },
  { value: '8', label: '8+ ★' },
  { value: '7', label: '7+ ★' },
  { value: '6', label: '6+ ★' },
]

// ── Icons (inline SVG wrappers) ───────────────────────────────────────────────
const IconFilter  = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
const IconChevron = ({ open }) => (
  <svg
    width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease' }}
  >
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconGenre  = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
const IconYear   = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
const IconStar   = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
  </svg>
)
const IconPerson = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

// ── FilterBar ─────────────────────────────────────────────────────────────────
const FilterBar = ({
  // navigation
  category, setCategory,
  // filters
  draftFilters, updateDraftFilter,
  appliedFilters, removeAppliedFilter,
  applyFilters, resetFilters,
  activeFilterCount, hasDraftChanges,
  castLoading,
  // data
  genres,
  totalResults,
  isLoading,
  isSearching,
}) => {
  const [panelOpen, setPanelOpen] = useState(false)

  const togglePanel = useCallback(() => setPanelOpen(v => !v), [])

  // Apply then close
  const handleApply = useCallback(async () => {
    await applyFilters()
    setPanelOpen(false)
  }, [applyFilters])

  // Reset and close
  const handleReset = useCallback(() => {
    resetFilters()
    setPanelOpen(false)
  }, [resetFilters])

  // Build chips from committed appliedFilters
  const activeChips = useMemo(() => {
    const chips = []
    if (appliedFilters.genreId) {
      const g = genres.find(g => String(g.id) === String(appliedFilters.genreId))
      if (g) chips.push({ key: 'genreId', label: g.name })
    }
    if (appliedFilters.year)      chips.push({ key: 'year',      label: appliedFilters.year })
    if (appliedFilters.minRating) chips.push({ key: 'minRating', label: `${appliedFilters.minRating}+ ★` })
    if (appliedFilters.castQuery) chips.push({ key: 'castQuery', label: `🎬 ${appliedFilters.castQuery}` })
    return chips
  }, [appliedFilters, genres])

  const currentCat = CATEGORIES.find(c => c.id === category)

  return (
    <div className="filterbar-v2">

      {/* ── Row 1: Category tabs ── */}
      {!isSearching && (
        <div className="filterbar-tabs" role="tablist" aria-label="Movie categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={category === cat.id}
              className={`filterbar-tab${category === cat.id ? ' filterbar-tab--active' : ''}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Row 2: Filters trigger + active chips + count ── */}
      <div className="filterbar-controls-row">

        {/* Filter toggle button */}
        <button
          className={[
            'filter-trigger-btn',
            panelOpen         ? 'filter-trigger-btn--open'   : '',
            activeFilterCount ? 'filter-trigger-btn--active' : '',
          ].join(' ')}
          onClick={togglePanel}
          aria-expanded={panelOpen}
          aria-controls="filter-panel"
        >
          <IconFilter />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <span className="filter-trigger-badge" aria-label={`${activeFilterCount} active filters`}>
              {activeFilterCount}
            </span>
          )}
          <IconChevron open={panelOpen} />
        </button>

        {/* Active filter chips */}
        {activeChips.length > 0 && (
          <div className="filter-chips" role="group" aria-label="Active filters">
            {activeChips.map((chip) => (
              <span key={chip.key} className="filter-chip">
                {chip.label}
                <button
                  className="filter-chip-remove"
                  onClick={() => removeAppliedFilter(chip.key)}
                  aria-label={`Remove ${chip.label} filter`}
                >
                  ×
                </button>
              </span>
            ))}
            <button className="filter-clear-all" onClick={handleReset} aria-label="Clear all filters">
              Clear all
            </button>
          </div>
        )}

        {/* Results / description */}
        {!isLoading && (
          <span className="filterbar-count" aria-live="polite">
            {isSearching
              ? `${totalResults.toLocaleString()} results`
              : currentCat?.description}
          </span>
        )}
      </div>

      {/* ── Row 3: Collapsible filter panel ── */}
      <div
        id="filter-panel"
        className={`filter-panel${panelOpen ? ' filter-panel--open' : ''}`}
        aria-hidden={!panelOpen}
        inert={!panelOpen ? '' : undefined}
      >
        <div className="filter-panel-inner">
          <div className="filter-panel-grid">

            {/* Genre */}
            <div className="filter-input-group">
              <label className="filter-input-label" htmlFor="fp-genre">
                <IconGenre /> Genre
              </label>
              <div className="filter-select-wrap">
                <select
                  id="fp-genre"
                  className="filter-select-v2"
                  value={draftFilters.genreId}
                  onChange={e => updateDraftFilter('genreId', e.target.value)}
                >
                  <option value="">All Genres</option>
                  {genres.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {draftFilters.genreId && (
                  <span className="filter-select-dot" aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Year */}
            <div className="filter-input-group">
              <label className="filter-input-label" htmlFor="fp-year">
                <IconYear /> Year
              </label>
              <div className="filter-select-wrap">
                <select
                  id="fp-year"
                  className="filter-select-v2"
                  value={draftFilters.year}
                  onChange={e => updateDraftFilter('year', e.target.value)}
                >
                  <option value="">Any Year</option>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {draftFilters.year && (
                  <span className="filter-select-dot" aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Min Rating */}
            <div className="filter-input-group">
              <label className="filter-input-label" htmlFor="fp-rating">
                <IconStar /> Min Rating
              </label>
              <div className="filter-select-wrap">
                <select
                  id="fp-rating"
                  className="filter-select-v2"
                  value={draftFilters.minRating}
                  onChange={e => updateDraftFilter('minRating', e.target.value)}
                >
                  {RATINGS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {draftFilters.minRating && (
                  <span className="filter-select-dot" aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Cast / Star */}
            <div className="filter-input-group">
              <label className="filter-input-label" htmlFor="fp-cast">
                <IconPerson /> Cast / Star
              </label>
              <input
                id="fp-cast"
                type="text"
                className={`filter-text-input${draftFilters.castQuery ? ' filter-text-input--filled' : ''}`}
                placeholder="e.g. Tom Cruise"
                value={draftFilters.castQuery}
                onChange={e => updateDraftFilter('castQuery', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleApply() }}
              />
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div className="filter-panel-actions">
            <div className="filter-panel-hint">
              {hasDraftChanges && (
                <span className="filter-hint-text">Unsaved changes</span>
              )}
            </div>
            <div className="filter-panel-btns">
              <button className="filter-reset-btn" onClick={handleReset}>
                Reset All
              </button>
              <button
                className={`filter-apply-btn${hasDraftChanges ? ' filter-apply-btn--highlight' : ''}`}
                onClick={handleApply}
                disabled={castLoading}
              >
                {castLoading ? (
                  <>
                    <span className="filter-apply-spinner" aria-hidden="true" />
                    Searching cast…
                  </>
                ) : (
                  'Apply Filters'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FilterBar