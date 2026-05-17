import { useState, useCallback, useMemo } from 'react'
import { CATEGORIES } from '../lib/tmdb'

const YEAR_PRESETS = [
  { label: String(new Date().getFullYear()), value: String(new Date().getFullYear()) },
  { label: '2020s', value: '2020s' },
  { label: '2010s', value: '2010s' },
  { label: '2000s', value: '2000s' },
  { label: '1990s', value: '1990s' },
]

const RATINGS = [
  { value: '9', label: '+9' },
  { value: '8', label: '+8' },
  { value: '7', label: '+7' },
  { value: '6', label: '+6' },
  { value: '5', label: '+5' },
  { value: '4', label: '+4' },
  { value: '3', label: '+3' },
  { value: '2', label: '+2' },
  { value: '1', label: '+1' },
]

const IconFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

const IconChevron = ({ open }) => (
  <svg
    width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.22s ease' }}
  >
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const FilterBar = ({
  category, setCategory,
  draftFilters, updateDraftFilter, toggleDraftGenre,
  appliedFilters, removeAppliedFilter, removeAppliedGenre,
  applyFilters, resetFilters,
  activeFilterCount, hasDraftChanges,
  genres,
  isSearching,
}) => {
  const [openSection, setOpenSection] = useState(null)

  const toggleSection = useCallback((section) => {
    setOpenSection(v => v === section ? null : section)
  }, [])

  const handleApply = useCallback(() => {
    applyFilters()
    setOpenSection(null)
  }, [applyFilters])

  const handleReset = useCallback(() => {
    resetFilters()
    setOpenSection(null)
  }, [resetFilters])

  // Build active chips
  const activeChips = useMemo(() => {
    const chips = []
    appliedFilters.genreIds.forEach(id => {
      const g = genres.find(g => String(g.id) === String(id))
      if (g) chips.push({ key: `genre-${id}`, label: g.name, onRemove: () => removeAppliedGenre(id) })
    })
    if (appliedFilters.year)
      chips.push({ key: 'year', label: appliedFilters.year, onRemove: () => removeAppliedFilter('year') })
    if (appliedFilters.minRating)
      chips.push({ key: 'minRating', label: `${appliedFilters.minRating}+ ★`, onRemove: () => removeAppliedFilter('minRating') })
    return chips
  }, [appliedFilters, genres, removeAppliedGenre, removeAppliedFilter])

  return (
    <div className="filterbar-v2">

      {/* ── Row 1: Category tabs + filter trigger buttons ── */}
      <div className="filterbar-top-row">
        {!isSearching && (
          <>
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
            <div className="filterbar-divider" aria-hidden="true" />
          </>
        )}

        <div className="filterbar-trigger-group">
          {/* Genre */}
          <button
            className={[
              'filter-trigger-btn',
              openSection === 'genre'        ? 'filter-trigger-btn--open'   : '',
              appliedFilters.genreIds.length ? 'filter-trigger-btn--active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => toggleSection('genre')}
            aria-expanded={openSection === 'genre'}
          >
            <IconFilter />
            Genre
            {appliedFilters.genreIds.length > 0 && (
              <span className="filter-trigger-badge">{appliedFilters.genreIds.length}</span>
            )}
            <IconChevron open={openSection === 'genre'} />
          </button>

          {/* Year */}
          <button
            className={[
              'filter-trigger-btn',
              openSection === 'year' ? 'filter-trigger-btn--open'   : '',
              appliedFilters.year    ? 'filter-trigger-btn--active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => toggleSection('year')}
            aria-expanded={openSection === 'year'}
          >
            Year
            {appliedFilters.year && <span className="filter-trigger-badge">1</span>}
            <IconChevron open={openSection === 'year'} />
          </button>

          {/* Rating */}
          <button
            className={[
              'filter-trigger-btn',
              openSection === 'rating'  ? 'filter-trigger-btn--open'   : '',
              appliedFilters.minRating  ? 'filter-trigger-btn--active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => toggleSection('rating')}
            aria-expanded={openSection === 'rating'}
          >
            Rating
            {appliedFilters.minRating && <span className="filter-trigger-badge">1</span>}
            <IconChevron open={openSection === 'rating'} />
          </button>
        </div>
      </div>

      {/* ── Row 2: Active filter chips — own row, never causes top-row shift ── */}
      {activeChips.length > 0 && (
        <div className="filterbar-chips-row" role="group" aria-label="Active filters">
          {activeChips.map((chip) => (
            <span key={chip.key} className="filter-chip">
              {chip.label}
              <button
                className="filter-chip-remove"
                onClick={chip.onRemove}
                aria-label={`Remove ${chip.label} filter`}
              >×</button>
            </span>
          ))}
          <button className="filter-clear-all" onClick={handleReset}>Clear all</button>
        </div>
      )}

      {/* ── Collapsible filter panel ── */}
      {openSection && (
        <div className="filter-panel filter-panel--open" style={{ maxHeight: 'none', pointerEvents: 'auto', opacity: 1 }}>
          <div className="filter-panel-inner">

            {openSection === 'genre' && (
              <div>
                <p className="filter-input-label" style={{ marginBottom: '0.75rem' }}>Select Genres (multi)</p>
                <div className="filter-toggle-grid">
                  {genres.map(g => {
                    const active = draftFilters.genreIds.includes(String(g.id))
                    return (
                      <button
                        key={g.id}
                        className={`filter-toggle-btn${active ? ' filter-toggle-btn--active' : ''}`}
                        onClick={() => toggleDraftGenre(g.id)}
                      >
                        {g.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {openSection === 'year' && (
              <div>
                <p className="filter-input-label" style={{ marginBottom: '0.75rem' }}>Select Year / Decade</p>
                <div className="filter-toggle-grid">
                  <button
                    className={`filter-toggle-btn${!draftFilters.year ? ' filter-toggle-btn--active' : ''}`}
                    onClick={() => updateDraftFilter('year', '')}
                  >Any</button>
                  {YEAR_PRESETS.map(p => (
                    <button
                      key={p.value}
                      className={`filter-toggle-btn${draftFilters.year === p.value ? ' filter-toggle-btn--active' : ''}`}
                      onClick={() => updateDraftFilter('year', draftFilters.year === p.value ? '' : p.value)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {openSection === 'rating' && (
              <div>
                <p className="filter-input-label" style={{ marginBottom: '0.75rem' }}>Minimum Rating</p>
                <div className="filter-toggle-grid">
                  <button
                    className={`filter-toggle-btn${!draftFilters.minRating ? ' filter-toggle-btn--active' : ''}`}
                    onClick={() => updateDraftFilter('minRating', '')}
                  >Any</button>
                  {RATINGS.map(r => (
                    <button
                      key={r.value}
                      className={`filter-toggle-btn${draftFilters.minRating === r.value ? ' filter-toggle-btn--active' : ''}`}
                      onClick={() => updateDraftFilter('minRating', draftFilters.minRating === r.value ? '' : r.value)}
                    >
                      ★ {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="filter-panel-actions">
              <div className="filter-panel-hint">
                {hasDraftChanges && (
                  <span className="filter-hint-text">Unsaved changes — click Apply</span>
                )}
              </div>
              <div className="filter-panel-btns">
                <button className="filter-reset-btn" onClick={handleReset}>Reset</button>
                <button
                  className={`filter-apply-btn${hasDraftChanges ? ' filter-apply-btn--highlight' : ''}`}
                  onClick={handleApply}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterBar