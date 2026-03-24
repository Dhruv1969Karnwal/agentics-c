import { useState, useEffect, useRef } from 'react'
import { Lock } from 'lucide-react'
import { login } from '../lib/api'
import AnimatedLogo from './AnimatedLogo'

export default function LoginScreen({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef(null)

  useEffect(() => {
    passwordRef.current?.focus()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(password)
      onSuccess()
    } catch (err) {
      setError(err.message || 'Invalid password')
      setLoading(false)
      passwordRef.current?.focus()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--c-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="card p-8">
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-12 h-12 flex items-center justify-center rounded-lg mb-4"
              style={{ background: 'rgba(99,102,241,0.12)' }}
            >
              <Lock size={24} style={{ color: 'var(--c-accent)' }} aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 text-lg font-bold" style={{ color: 'var(--c-white)' }}>
              <AnimatedLogo size={20} />
              Agentlytics
              <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--c-accent-light)' }}>
                relay
              </span>
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--c-text2)', textAlign: 'center' }}>
              This relay is password-protected. Enter the password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--c-text)' }}>
                Password
              </label>
              <input
                ref={passwordRef}
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 text-sm rounded transition min-h-[44px]"
                style={{
                  background: 'var(--c-bg3)',
                  color: 'var(--c-white)',
                  border: error ? '1px solid var(--c-error)' : '1px solid var(--c-border)',
                }}
                aria-describedby={error ? 'password-error' : undefined}
                aria-invalid={!!error}
              />
              {error && (
                <div id="password-error" className="text-sm mt-2 flex items-center gap-1.5" style={{ color: 'var(--c-error)' }} role="alert">
                  <X size={14} aria-hidden="true" />
                  {error}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 text-sm font-medium rounded transition min-h-[44px] btn-primary"
              style={{
                opacity: loading || !password ? 0.6 : 1,
              }}
              aria-busy={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>
        </div>
        <p className="text-xs text-center mt-4" style={{ color: 'var(--c-text3)' }}>
          Use the password provided by your team administrator.
        </p>
      </div>
    </div>
  )
}
