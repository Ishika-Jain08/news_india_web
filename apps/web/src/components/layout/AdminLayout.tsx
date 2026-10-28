import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth, useI18n } from '../../app/providers'

export function AdminLayout() {
  const { user, ready, logout } = useAuth()
  const { t, lang, setLang } = useI18n()
  if (!ready) return <p className="p-8">{t.loading}</p>
  if (!user) return <Navigate to="/admin/login" replace />
  const editorial = user.role === 'admin' || user.role === 'editor'
  const items = [
    ['/admin', t.dashboard],
    ['/admin/articles', t.articles],
    ['/admin/review', t.review],
    ...(editorial ? [['/admin/breaking', t.breakingDesk], ['/admin/categories', t.categoriesAdmin], ['/admin/live', t.liveSettings]] : []),
    ['/admin/media', t.media],
    ...(editorial ? [['/admin/audit', t.audit]] : []),
    ...(user.role === 'admin' ? [['/admin/users', t.users]] : []),
  ] as [string, string][]
  return (
    <div className="min-h-screen bg-paper md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-navy text-paper">
        <div className="flex items-center justify-between px-4 py-4">
          <NavLink to={`/${lang}`} className="font-serif text-2xl">{t.brand}</NavLink>
          <button type="button" className="text-xs" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>{lang === 'en' ? 'हिन्दी' : 'EN'}</button>
        </div>
        <p className="px-4 text-xs text-paper/70">{user.role === 'admin' ? t.roleAdmin : user.role === 'editor' ? t.roleEditor : t.roleReporter}</p>
        <nav className="mt-4 flex gap-2 overflow-auto px-2 pb-4 md:block" aria-label="Newsroom">
          {items.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/admin'} className={({ isActive }) => `block whitespace-nowrap rounded px-3 py-2 text-sm ${isActive ? 'bg-crimson' : 'hover:bg-white/10'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={() => logout()} className="m-3 rounded border border-white/30 px-3 py-2 text-sm">{t.signOut}</button>
      </aside>
      <div>
        <div className="bg-gold/15 px-4 py-2 text-sm text-ink">{t.demoBanner}</div>
        <main className="p-4 md:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
