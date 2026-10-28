import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { NotFoundPage } from '../../features/pages/NotFoundPage'
import { useAuth, useI18n } from '../../app/providers'

const links = [
  ['navHome', ''],
  ['navNational', '/national'],
  ['navState', '/state'],
  ['navLocal', '/local'],
  ['navTrending', '/trending'],
  ['navTop', '/top'],
  ['navBreaking', '/breaking'],
  ['navLive', '/live'],
] as const

export function PublicLayout() {
  const { lang, t, setLang } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const params = useParams()
  const [open, setOpen] = useState(false)
  if (params.lang !== 'en' && params.lang !== 'hi') return <NotFoundPage />
  const today = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'full', timeZone: 'Asia/Kolkata' }).format(new Date())

  return (
    <div className="min-h-screen">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-card focus:px-3 focus:py-2">
        {t.skip}
      </a>
      <div className="bg-navy px-4 py-2 text-center text-sm text-paper">{t.demoBanner}</div>
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2 text-xs text-muted">
          <p>{today}</p>
          <div className="flex items-center gap-2">
            <span className="sr-only">{t.language}</span>
            <button type="button" className={`rounded px-2 py-1 ${lang === 'en' ? 'bg-ink text-paper' : ''}`} onClick={() => setLang('en')}>
              {t.english}
            </button>
            <button type="button" className={`rounded px-2 py-1 ${lang === 'hi' ? 'bg-ink text-paper' : ''}`} onClick={() => setLang('hi')}>
              {t.hindi}
            </button>
            <Link to="/admin" className="rounded px-2 py-1 font-semibold text-navy">
              {user ? user.name : t.admin}
            </Link>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-5 text-center">
          <Link to={`/${lang}`} className="font-serif text-5xl font-bold tracking-tight text-ink sm:text-6xl">
            {t.brand}
          </Link>
          <p className="mt-1 text-sm uppercase tracking-[0.22em] text-gold">{t.tagline}</p>
        </div>
        <nav className="border-t border-line" aria-label="Primary">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2">
            <button type="button" className="rounded border border-line px-3 py-2 text-sm md:hidden" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              {t.menu}
            </button>
            <div className={`${open ? 'flex' : 'hidden'} absolute left-0 right-0 top-40 z-20 flex-col gap-1 border-b border-line bg-card p-3 md:static md:flex md:flex-row md:flex-wrap md:border-0 md:bg-transparent md:p-0`}>
              {links.map(([key, path]) => (
                <NavLink key={key} to={`/${lang}${path}`} end={path === ''} className={({ isActive }) => `rounded px-3 py-2 text-sm font-semibold ${isActive ? 'bg-navy text-paper' : 'hover:bg-paper'}`} onClick={() => setOpen(false)}>
                  {t[key]}
                </NavLink>
              ))}
            </div>
            <form
              className="ml-auto flex min-w-0"
              onSubmit={(event) => {
                event.preventDefault()
                navigate(`/${lang}/search?q=${encodeURIComponent(query)}`)
                setOpen(false)
              }}
            >
              <label className="sr-only" htmlFor="site-search">{t.searchAction}</label>
              <input id="site-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.searchPlaceholder} className="w-36 rounded-l border border-line bg-paper px-3 py-2 text-sm sm:w-56" />
              <button type="submit" className="rounded-r bg-crimson px-3 py-2 text-sm font-semibold text-paper">{t.searchAction}</button>
            </form>
          </div>
        </nav>
      </header>
      <main id="content" className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="mt-8 border-t border-line bg-navy text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:justify-between">
          <div>
            <p className="font-serif text-2xl">{t.brand}</p>
            <p className="mt-2 max-w-md text-sm text-paper/80">{t.footerNote}</p>
          </div>
          <div className="flex gap-4 text-sm">
            <Link to={`/${lang}/about`}>{t.navAbout}</Link>
            <Link to={`/${lang}/contact`}>{t.navContact}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
