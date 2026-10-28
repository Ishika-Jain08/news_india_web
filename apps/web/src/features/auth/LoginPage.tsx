import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth, useI18n } from '../../app/providers'
import { ApiError } from '../../services/api'

export function LoginPage() {
  const { t } = useI18n()
  const { user, ready, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('editor@newsindia.example')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  if (ready && user) return <Navigate to="/admin" replace />
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <p className="text-xs uppercase tracking-[0.16em] text-crimson">{t.brand}</p>
      <h1 className="mt-2 font-serif text-4xl">{t.loginTitle}</h1>
      <p className="mt-3 text-sm text-muted">{t.loginHint}</p>
      <form
        className="mt-6 space-y-3 rounded-xl border border-line bg-card p-5"
        onSubmit={async (event) => {
          event.preventDefault()
          setError('')
          try {
            await login(email, password)
            navigate('/admin')
          } catch (reason) {
            setError(reason instanceof ApiError ? reason.message : t.loginError)
          }
        }}
      >
        <label className="block text-sm font-semibold">{t.email}
          <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-2 font-normal" />
        </label>
        <label className="block text-sm font-semibold">{t.password}
          <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-2 font-normal" />
        </label>
        {error ? <p className="text-sm text-crimson" role="alert">{error}</p> : null}
        <button type="submit" className="w-full rounded bg-navy px-4 py-2 font-semibold text-paper">{t.signIn}</button>
      </form>
      <ul className="mt-4 space-y-1 text-xs text-muted">
        <li>admin@newsindia.example / Admin@12345</li>
        <li>editor@newsindia.example / Editor@12345</li>
        <li>reporter@newsindia.example / Reporter@12345</li>
      </ul>
    </main>
  )
}
