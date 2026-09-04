/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react'

/**
 * PROTOTYPE AUTH — TESTING ONLY.
 *
 * This is a deliberately fake authentication context so the Login/Register UI
 * can be built and tested end-to-end. It does NOT verify credentials, talk to
 * any backend, or store passwords — nothing sensitive ever touches storage.
 *
 * To implement real auth later: swap the bodies of `login`/`register`/`logout`
 * for your real API calls and keep the same shapes. The UI (Navbar + the
 * standalone /login page) does not need to change. Passwords are validated in
 * the UI and deliberately never stored, logged or transmitted by this
 * prototype — a real backend would receive them through these functions.
 */

const STORAGE_KEY = 'bingetime.auth.user'

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const user = JSON.parse(raw)
    return user && user.email ? user : null
  } catch {
    return null
  }
}

const displayNameFromEmail = (email = '') => {
  const local = String(email).split('@')[0] || 'User'
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

// Small delay so the busy state in the UI is actually visible during tests.
const simulateLatency = () => new Promise(resolve => setTimeout(resolve, 450))

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser)

  // The UI passes the submitted password as the last argument; a real backend
  // will receive it there. This prototype ignores it on purpose.
  const login = useCallback(async (email) => {
    await simulateLatency()
    const demoUser = { email, name: displayNameFromEmail(email), demo: true }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
    setUser(demoUser)
  }, [])

  const register = useCallback(async (name, email) => {
    await simulateLatency()
    const demoUser = {
      email,
      name: name.trim() || displayNameFromEmail(email),
      demo: true,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser))
    setUser(demoUser)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
