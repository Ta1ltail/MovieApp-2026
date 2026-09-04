import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * AuthModal — Login / Register UI.
 *
 * Prototype only (see AuthContext): submission is validated client-side and
 * then handled by the fake auth context. The modal layout/tabs are the
 * intended surface for a real backend later — swap AuthContext, keep this.
 */
const AuthModal = ({ isOpen, onClose }) => {
  const { login, register } = useAuth()
  const [mode, setMode]     = useState('login') // 'login' | 'register'
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]   = useState('')
  const [busy, setBusy]     = useState(false)
  const emailRef = useRef(null)
  const overlayRef = useRef(null)

  // Reset everything when the modal is closed (guarded render-phase reset —
  // no sync setState inside an effect).
  const [prevOpen, setPrevOpen] = useState(isOpen)
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen)
    if (!isOpen) {
      setMode('login')
      setName('')
      setEmail('')
      setPassword('')
      setConfirm('')
      setError('')
      setBusy(false)
    }
  }

  // Focus the first field + close on Escape while open.
  useEffect(() => {
    if (!isOpen) return
    const t = setTimeout(() => emailRef.current?.focus(), 60)
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  const switchMode = useCallback((m) => { setMode(m); setError('') }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const em = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters.')
      return
    }
    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'login') await login(em, password)
      else await register(name, em, password)
      onClose()
    } catch (err) {
      setError(err?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="auth-modal-overlay"
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div className="auth-modal-header">
          <h2 id="auth-modal-title" className="auth-modal-title">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <button type="button" className="kb-modal-close" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
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
              placeholder="At least 4 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={4}
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
                minLength={4}
              />
            </label>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-modal-note">
          Prototype authentication — testing build only. No real account is created,
          credentials are never stored or verified, and nothing is sent to a server.
        </p>
      </div>
    </div>
  )
}

export default AuthModal
