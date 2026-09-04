import { useEffect, useState, useCallback } from 'react'

/**
 * useKeyboardShortcuts — global shortcut state.
 * Pressing '?' (when not typing in an input) toggles the shortcuts modal.
 *
 * Returns { shortcutsOpen, setShortcutsOpen, closeShortcuts }
 */
export const useKeyboardShortcuts = () => {
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable

      if (isInput) return

      if (e.key === '?') {
        e.preventDefault()
        setShortcutsOpen(v => !v)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return { shortcutsOpen, setShortcutsOpen, closeShortcuts }
}
