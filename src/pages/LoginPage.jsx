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
  const { user, login, register } = useAuth()
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
  const emailRef = useRef(null)

  // Focus the first field on arrival.
  useEffect(() => {
    const t = setTimeout(() => emailRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  const switchMode = useCallback((m) => { setMode(m); setError('') }, [])

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
      </div>

      <Link to="/" className="auth-back-home">← Back to browsing</Link>
    </div>
  )
}

export default LoginPage
