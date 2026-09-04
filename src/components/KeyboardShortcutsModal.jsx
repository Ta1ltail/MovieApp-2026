import { useEffect } from 'react'

/**
 * Modal showing all keyboard shortcuts.
 * Open by pressing '?' globally (see hooks/useKeyboardShortcuts).
 */
const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => { if (e.key === 'Escape' || e.key === '?') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const shortcuts = [
    { key: '/',         desc: 'Focus search bar' },
    { key: 'Esc',       desc: 'Close modal / clear search' },
    { key: '←  →',     desc: 'Navigate carousel slides' },
    { key: 'F',         desc: 'Fullscreen video player (when focused)' },
    { key: '?',         desc: 'Open this shortcuts help' },
  ]

  return (
    <div
      className="kb-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="kb-modal">
        <div className="kb-modal-header">
          <h2 className="kb-modal-title">Keyboard Shortcuts</h2>
          <button className="kb-modal-close" onClick={onClose} aria-label="Close shortcuts modal">✕</button>
        </div>
        <ul className="kb-shortcut-list">
          {shortcuts.map(({ key, desc }) => (
            <li key={key} className="kb-shortcut-row">
              <kbd className="kb-key">{key}</kbd>
              <span className="kb-desc">{desc}</span>
            </li>
          ))}
        </ul>
        <p className="kb-modal-footer">Shortcuts are disabled when typing in inputs.</p>
      </div>
    </div>
  )
}

export default KeyboardShortcutsModal
