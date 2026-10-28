import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { PublicUser } from '@news-india/shared'
import { dictionaries, type Dictionary, type Language } from '../lib/i18n'
import { api, setCsrfToken } from '../services/api'

interface LanguageValue {
  lang: Language
  t: Dictionary
  setLang: (lang: Language) => void
}

const LanguageContext = createContext<LanguageValue | null>(null)
const AuthContext = createContext<{
  user: PublicUser | null
  ready: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
} | null>(null)

function readStoredLang(): Language {
  return localStorage.getItem('news-india-lang') === 'hi' ? 'hi' : 'en'
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [stored, setStored] = useState<Language>(readStoredLang)
  const routeLang = location.pathname.match(/^\/(en|hi)(\/|$)/)?.[1] as Language | undefined
  const lang = routeLang ?? stored
  useEffect(() => {
    document.documentElement.lang = lang
    localStorage.setItem('news-india-lang', lang)
  }, [lang])
  const value = useMemo<LanguageValue>(() => ({
    lang,
    t: dictionaries[lang],
    setLang: (next) => {
      setStored(next)
      localStorage.setItem('news-india-lang', next)
      if (routeLang) navigate(location.pathname.replace(/^\/(en|hi)/, `/${next}`) + location.search)
    },
  }), [lang, location.pathname, location.search, navigate, routeLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useI18n() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('LanguageProvider is missing')
  return value
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [ready, setReady] = useState(false)

  async function refresh() {
    const token = await api<{ data: { csrfToken: string } }>('/auth/csrf')
    setCsrfToken(token.data.csrfToken)
    try {
      const me = await api<{ data: PublicUser }>('/auth/me')
      setUser(me.data)
    } catch {
      setUser(null)
    }
  }

  useEffect(() => {
    refresh().finally(() => setReady(true))
  }, [])

  async function login(email: string, password: string) {
    const result = await api<{ data: { user: PublicUser; csrfToken: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setCsrfToken(result.data.csrfToken)
    setUser(result.data.user)
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    setUser(null)
    await refresh()
  }

  return <AuthContext.Provider value={{ user, ready, login, logout, refresh }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing')
  return value
}
