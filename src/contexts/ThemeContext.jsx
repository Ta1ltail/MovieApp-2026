/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

// Theme switches must be INSTANT — no palette cross-fade. We temporarily add
// a .no-transitions class to <html> while data-theme is swapped, then remove
// it after the theme has painted (two frames later).
const withoutTransitions = (fn) => {
  const root = document.documentElement
  root.classList.add('no-transitions')
  fn()
  requestAnimationFrame(() =>
    requestAnimationFrame(() => root.classList.remove('no-transitions')))
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () =>
    withoutTransitions(() => setTheme(t => (t === 'dark' ? 'light' : 'dark')))

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
