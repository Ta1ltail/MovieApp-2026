import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePageTitle } from '../hooks/usePageTitle'

/**
 * LoginPage — standalone Login / Register route (/login).
 *
 * Real Supabase email + password auth (see AuthContext). Submission is
 * validated client-side, then handed to the auth context; a signed-in user
 * is redirected back to where they came from (or home). After signing in,
 * any guest watch data found in localStorage is offered for import via the
 * banner on the Home page (see UserDataContext).
 */
const LoginPage = () => {
  const { user, login, register, googleLogin } = useAuth()
  const location = useLocation()
  const from = location.state?.from && location.state.from !== '/login'
    ? location.state.from
    : '/'

  const [mode, setMode]       = useState('login') // 'login' | 'register'
  usePageTitle(mode === 'login' ? 'Log in' : 'Create account')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError]     = useState('')
  const [busy, setBusy]       = useState(false)
  const [googleBusy, setGoogleBusy] = useState(false)
  const emailRef = useRef(null)

  // Focus the first field on arrival.
  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  const switchMode = useCallback((m) => { setMode(m); setError('') }, [])

  const handleGoogle = useCallback(async () => {
    setError('')
    setGoogleBusy(true)
    try {
      await googleLogin()
      // Browser navigates away to Google; nothing to do on success.
    } catch (err) {
      setError(err?.message ?? 'Could not start Google sign-in.')
      setGoogleBusy(false)
    }
  }, [googleLogin])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const em = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(em, password)
      } else {
        await register(name, em, password)
      }
      // On success `user` updates and the <Navigate> below sends the visitor
      // back where they came from — no manual navigation needed.
    } catch (err) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // Already signed in (or just signed in) → leave the login page.
  if (user) return <Navigate to={from} replace />

  return (
    <div className="auth-page">
      <Link to="/" className="auth-brand" aria-label="BingeTime — home">
        <span className="navbar-logo-icon" aria-hidden="true">🎬</span>
        <span className="navbar-logo-text">
          Binge<span className="text-gradient">Time</span>
        </span>
      </Link>

      <div className="auth-modal" role="region" aria-label="Log in or create an account">
        <div className="auth-modal-header">
          <h1 id="auth-modal-title" className="auth-modal-title">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
        </div>

        {/* Mode tabs */}
        <div className="auth-tabs" role="tablist" aria-label="Log in or register">
          {(['login', 'register']).map(m => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`auth-tab${mode === m ? ' auth-tab--active' : ''}`}
              onClick={() => switchMode(m)}
            >
              {m === 'login' ? 'Log in' : 'Register'}
            </button>
          ))}
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <label className="auth-field">
              <span className="auth-label">Name (optional)</span>
              <input
                type="text"
                className="auth-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="How should we call you?"
                autoComplete="name"
              />
            </label>
          )}

          <label className="auth-field">
            <span className="auth-label">Email</span>
            <input
              ref={emailRef}
              type="email"
              className="auth-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span className="auth-label">Password</span>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />
          </label>

          {mode === 'register' && (
            <label className="auth-field">
              <span className="auth-label">Confirm password</span>
              <input
                type="password"
                className="auth-input"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </label>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div className="auth-divider" role="separator" aria-label="Or">
          <span>or</span>
        </div>

        <button
          type="button"
          className="auth-google-btn"
          onClick={handleGoogle}
          disabled={googleBusy}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          {googleBusy ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </div>

      <Link to="/" className="auth-back-home">← Back to browsing</Link>
    </div>
  )
}

export default LoginPage
