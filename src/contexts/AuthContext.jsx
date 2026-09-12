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
 *   • At registration we still send a confirmation email (a magic-link OTP).
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
  // User id whose address we've PROVEN verified in this tab (email link
  // consumed / Google OAuth return). Guards against a slower duplicate
  // profile read overwriting a fresh verified=true with a stale false.
  const verifiedUserRef = useRef(null)

  // Read profiles.email_verified for the signed-in user (Google users get
  // true without a DB call — the provider verified them).
  const loadVerificationState = useCallback(async (u) => {
    if (!u) { verifiedUserRef.current = null; setEmailVerified(true); return }
    if (u.app_metadata?.provider === 'google') {
      verifiedUserRef.current = u.id
      setEmailVerified(true)
      return
    }
    // Already proven verified in this tab? A duplicate async profile read
    // (e.g. a SIGNED_IN event racing the link-consumption flow) must not
    // flip it back to false.
    if (verifiedUserRef.current === u.id) return
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

  // Consume the confirmation-email redirect. Three shapes, all ending on
  // the homepage, still logged in:
  //   • ?token_hash=…&type=magiclink — a custom template that links straight
  //     to the app; we verify the OTP ourselves.
  //   • #access_token=… — the DEFAULT template's flow: the auth server
  //     verifies the link and redirects back with tokens in the URL
  //     fragment; supabase-js consumes them and establishes the session.
  //     Google OAuth also returns in this shape — marking verified is
  //     correct there too, since Google proved the address.
  //   • ?verify=success — future server-side handshakes (defensive).
  const consumeVerifyRedirect = useCallback(async () => {
    const params = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(
      window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    )
    const tokenHash = params.get('token_hash')
    const verifyFlag = params.get('verify')
    const tokenInFragment = Boolean(hashParams.get('access_token'))
    if (!tokenHash && verifyFlag !== 'success' && !tokenInFragment) return false

    let verified = false
    if (tokenHash) {
      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: params.get('type') || 'magiclink',
        })
        verified = !error
      } catch { verified = false }
    }
    if (!verified) {
      // The link was already consumed by supabase-js (detectSessionInUrl) or
      // by the auth server's redirect. Poll briefly for the session it
      // establishes — being authenticated here means the address was just
      // verified by the email link.
      for (let attempt = 0; attempt < 10 && !verified; attempt += 1) {
        try {
          const { data } = await supabase.auth.getSession()
          if (data.session?.user) verified = true
        } catch { /* keep polling */ }
        if (!verified) await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
    if (verified) {
      try {
        const { data } = await supabase.auth.getUser()
        verifiedUserRef.current = data.user?.id ?? null
      } catch { /* the flag below is set regardless */ }
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
    verifiedUserRef.current = null
    setEmailVerified(false)

    // Verification email, sent automatically right after signup. Clicking
    // the link verifies the address and returns to the homepage logged in;
    // consumeVerifyRedirect then flips profiles.email_verified.
    supabase.auth.signInWithOtp({
      email: String(email).trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.origin,
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
    verifiedUserRef.current = null
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
