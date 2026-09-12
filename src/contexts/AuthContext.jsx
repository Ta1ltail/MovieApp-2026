import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/* eslint-disable react-refresh/only-export-components */

/**
 * AUTH — Supabase email + password.
 *
 * The public API is unchanged from the earlier prototype ({ user, login,
 * register, logout }), so the Navbar and the /login page did not need to
 * change. Sessions are persisted and auto-refreshed by supabase-js; on
 * expiry the user simply reverts to the guest experience — nothing crashes.
 *
 * `user` shape (UI-facing): { id, email, name }
 */

const displayNameFromEmail = (email = '') => {
  const local = String(email).split('@')[0] || 'User'
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const toUiUser = (sessionUser) => {
  if (!sessionUser) return null
  const meta = sessionUser.user_metadata ?? {}
  return {
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    name: (meta.name || '').trim() || displayNameFromEmail(sessionUser.email),
  }
}

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    if (!isSupabaseConfigured) return undefined

    // Restore an existing session, then subscribe to changes (sign-in from
    // another tab, token refresh, expiry).
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mountedRef.current) return
        setUser(toUiUser(data.session?.user))
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setAuthReady(true)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return
      setUser(toUiUser(session?.user))
    })

    return () => {
      mountedRef.current = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  // The UI passes (email, password); extra args are accepted for
  // compatibility but unused.
  const login = useCallback(async (email, password) => {
    if (!isSupabaseConfigured) throw new Error('Auth is not configured — missing Supabase environment variables.')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password,
    })
    if (error) throw error
    setUser(toUiUser(data.user))
  }, [])

  const register = useCallback(async (name, email, password) => {
    if (!isSupabaseConfigured) throw new Error('Auth is not configured — missing Supabase environment variables.')
    const trimmedName = String(name ?? '').trim()
    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim().toLowerCase(),
      password,
      options: {
        data: { name: trimmedName || displayNameFromEmail(email) },
        // BingeTime is a personal project with no transactional email set
        // up: confirm immediately so the account is usable right away.
        emailConfirm: false,
      },
    })
    if (error) throw error
    // If the project requires email confirmation, data.session is null and
    // the UI stays on the login page with the standard "check your inbox"
    // path (Supabase's message is surfaced through the thrown/absent error).
    if (data.session) setUser(toUiUser(data.user))
  }, [])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      /* signing out a dead session is fine */
    }
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, authReady, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
