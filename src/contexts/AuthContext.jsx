import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

/* eslint-disable react-refresh/only-export-components */

/**
 * AUTH — Supabase email + password, Google OAuth, and soft email
 * verification.
 *
 * Public API (superset of the original prototype — existing callers keep
 * working): { user, authReady, emailVerified, login, register, logout,
 *             googleLogin, resendVerification, refreshVerificationState }
 *
 * Email verification model (see supabase/migrations/20260912_email_verified.sql):
 *   • "Confirm email" is OFF in the dashboard → users log in IMMEDIATELY
 *     after registering, no verification gate.
 *   • At registration we still send a branded BingeTime confirmation email
 *     (a magic-link OTP with createSession:false so it only verifies).
 *   • Clicking the email's button verifies the address and redirects back
 *     to the homepage, still logged in — the app calls the
 *     mark_email_verified RPC, flipping profiles.email_verified.
 *   • Google users are trusted verified (Google proved inbox ownership).
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
    name: (meta.name || '').trim()
      || (meta.full_name || '').trim()
      || displayNameFromEmail(sessionUser.email),
  }
}

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [emailVerified, setEmailVerified] = useState(true)
  const mountedRef = useRef(true)

  // Read profiles.email_verified for the signed-in user (Google users get
  // true without a DB call — the provider verified them).
  const loadVerificationState = useCallback(async (u) => {
    if (!u) { setEmailVerified(true); return }
    if (u.app_metadata?.provider === 'google') { setEmailVerified(true); return }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('email_verified')
        .eq('id', u.id)
        .single()
      if (mountedRef.current) setEmailVerified(Boolean(data?.email_verified))
    } catch {
      // Table missing / network issue: default to verified so we never
      // nag users over an infrastructure hiccup.
      if (mountedRef.current) setEmailVerified(true)
    }
  }, [])

  // Consume the confirmation-email redirect. Two shapes:
  //   • ?token_hash=…&type=magiclink — the OTP link from our branded email;
  //     we verify it client-side (verifies the address, same user, already
  //     logged in), flag the profile, and clean the URL.
  //   • ?verify=success — future server-side handshakes (defensive).
  // Both end on the homepage, still logged in.
  const consumeVerifyRedirect = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const verifyFlag = params.get('verify')
    if (!tokenHash && verifyFlag !== 'success') return false

    let verified
    if (tokenHash) {
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: params.get('type') || 'magiclink',
        })
        verified = !error
      } catch { verified = false }
    } else {
      const u = (await supabase.auth.getUser()).data.user
      verified = Boolean(u)
    }
    if (verified) {
      await supabase.rpc('mark_email_verified').catch(() => {})
      if (mountedRef.current) setEmailVerified(true)
    }
    // Always land on a clean homepage URL.
    window.history.replaceState({}, '', window.location.pathname)
    return verified
  }, [])

  useEffect(() => {
    mountedRef.current = true
    if (!isSupabaseConfigured) return undefined

    supabase.auth.getSession()
      .then(async ({ data }) => {
        if (!mountedRef.current) return
        const u = data.session?.user ?? null
        setUser(toUiUser(u))
        await consumeVerifyRedirect()
        await loadVerificationState(u)
      })
      .catch(() => {})
      .finally(() => {
        if (mountedRef.current) setAuthReady(true)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mountedRef.current) return
      const u = session?.user ?? null
      setUser(toUiUser(u))
      // Verify-state changes arrive asynchronously after the session.
      void loadVerificationState(u)
    })

    return () => {
      mountedRef.current = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [consumeVerifyRedirect, loadVerificationState])

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
    await loadVerificationState(data.user)
  }, [loadVerificationState])

  const register = useCallback(async (name, email, password) => {
    if (!isSupabaseConfigured) throw new Error('Auth is not configured — missing Supabase environment variables.')
    const trimmedName = String(name ?? '').trim()
    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim().toLowerCase(),
      password,
      options: { data: { name: trimmedName || displayNameFromEmail(email) } },
    })
    if (error) throw error
    if (!data.session) {
      // Only happens if "Confirm email" gets turned back ON in the dashboard.
      throw new Error('This account needs email confirmation before first login. Click the link we emailed you, then log in.')
    }
    setUser(toUiUser(data.user))
    setEmailVerified(false)

    // Branded verification email, sent automatically right after signup.
    // A magic-link OTP with createSession:false only VERIFIES the address —
    // it never creates a second session and doesn't depend on the dashboard
    // "Confirm email" toggle (see supabase/auth#2513).
    supabase.auth.signInWithOtp({
      email: String(email).trim().toLowerCase(),
      options: {
        createSession: false, // verify-only link — never a second session
        emailRedirectTo: window.location.origin, // → homepage, still logged in
        shouldCreateUser: false,
      },
    }).catch(() => { /* non-fatal — the menu warning has a resend button */ })
  }, [])

  // Profile-page resend: same branded email, same semantics.
  const resendVerification = useCallback(async () => {
    const email = user?.email
    if (!email) throw new Error('You need to be signed in to resend the verification email.')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        createSession: false,
        emailRedirectTo: window.location.origin,
        shouldCreateUser: false,
      },
    })
    if (error) throw error
  }, [user?.email])

  const refreshVerificationState = useCallback(async () => {
    const { data } = await supabase.auth.getUser()
    await loadVerificationState(data.user ?? null)
  }, [loadVerificationState])

  const googleLogin = useCallback(async () => {
    if (!isSupabaseConfigured) throw new Error('Auth is not configured — missing Supabase environment variables.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
    // Browser navigates to Google; session arrives via onAuthStateChange.
  }, [])

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      /* signing out a dead session is fine */
    }
    setUser(null)
    setEmailVerified(true)
  }, [])

  return (
    <AuthContext.Provider value={{
      user, authReady, emailVerified,
      login, register, logout,
      googleLogin, resendVerification, refreshVerificationState,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
