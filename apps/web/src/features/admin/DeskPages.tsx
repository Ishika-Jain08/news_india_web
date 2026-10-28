import { useEffect, useState } from 'react'
import type { PageMeta } from '@news-india/shared'
import { useAuth, useI18n } from '../../app/providers'
import { ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { useAsync } from '../../hooks/useAsync'
import { ApiError, api, fileUrl } from '../../services/api'

export function CategoriesPage() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const state = useAsync(() => api<{ data: { id: string; slug: string; nameEn: string; nameHi: string; descriptionEn: string; descriptionHi: string }[] }>('/admin/categories'), [])
  const [nameEn, setNameEn] = useState('')
  const [nameHi, setNameHi] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [descriptionHi, setDescriptionHi] = useState('')
  const [error, setError] = useState('')
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  return (
    <div>
      <h1 className="font-serif text-4xl">{t.categoriesAdmin}</h1>
      {user?.role === 'reporter' ? null : <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault()
        setError('')
        try {
          await api('/admin/categories', { method: 'POST', body: JSON.stringify({ nameEn, nameHi, descriptionEn, descriptionHi }) })
          state.reload()
          setNameEn(''); setNameHi(''); setDescriptionEn(''); setDescriptionHi('')
        } catch (reason) { setError(reason instanceof ApiError ? reason.message : t.error) }
      }}>
        <input required placeholder={t.name} value={nameEn} onChange={(event) => setNameEn(event.target.value)} className="rounded border border-line px-3 py-2" />
        <input required placeholder={t.nameHi} value={nameHi} onChange={(event) => setNameHi(event.target.value)} className="rounded border border-line px-3 py-2" />
        <input required placeholder={t.summary} value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value)} className="rounded border border-line px-3 py-2" />
        <input required placeholder={t.summary} value={descriptionHi} onChange={(event) => setDescriptionHi(event.target.value)} className="rounded border border-line px-3 py-2" />
        <button className="rounded bg-navy px-3 py-2 text-paper sm:col-span-2" type="submit">{t.create}</button>
      </form>}
      {error ? <p className="mt-2 text-sm text-crimson">{error}</p> : null}
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">
        {state.data.data.map((category) => (
          <li key={category.id} className="flex items-center justify-between p-3">
            <span>{lang === 'hi' ? category.nameHi : category.nameEn} <span className="text-muted">/{category.slug}</span></span>
            {user?.role === 'admin' ? <button type="button" className="text-sm text-crimson" onClick={async () => { await api(`/admin/categories/${category.id}`, { method: 'DELETE' }); state.reload() }}>{t.delete}</button> : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function UsersPage() {
  const { t } = useI18n()
  const state = useAsync(() => api<{ data: { id: string; email: string; name: string; nameHi: string; role: 'admin' | 'editor' | 'reporter'; active: boolean }[] }>('/admin/users'), [])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [nameHi, setNameHi] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'editor' | 'reporter'>('reporter')
  const [error, setError] = useState('')
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  return (
    <div>
      <h1 className="font-serif text-4xl">{t.users}</h1>
      <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault()
        try {
          await api('/admin/users', { method: 'POST', body: JSON.stringify({ email, name, nameHi, password, role }) })
          state.reload()
        } catch (reason) { setError(reason instanceof ApiError ? reason.message : t.error) }
      }}>
        <input required type="email" placeholder={t.email} value={email} onChange={(event) => setEmail(event.target.value)} className="rounded border border-line px-3 py-2" />
        <input required placeholder={t.name} value={name} onChange={(event) => setName(event.target.value)} className="rounded border border-line px-3 py-2" />
        <input required placeholder={t.nameHi} value={nameHi} onChange={(event) => setNameHi(event.target.value)} className="rounded border border-line px-3 py-2" />
        <input required type="password" placeholder={t.password} value={password} onChange={(event) => setPassword(event.target.value)} className="rounded border border-line px-3 py-2" />
        <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} className="rounded border border-line px-3 py-2"><option value="reporter">{t.roleReporter}</option><option value="editor">{t.roleEditor}</option><option value="admin">{t.roleAdmin}</option></select>
        <button className="rounded bg-navy px-3 py-2 text-paper" type="submit">{t.create}</button>
      </form>
      {error ? <p className="mt-2 text-sm text-crimson">{error}</p> : null}
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">
        {state.data.data.map((person) => (
          <li key={person.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span>{person.name} · {person.email}</span>
            <select value={person.role} onChange={async (event) => { await api(`/admin/users/${person.id}/role`, { method: 'PATCH', body: JSON.stringify({ role: event.target.value }) }); state.reload() }} className="rounded border border-line px-2 py-1">
              <option value="reporter">{t.roleReporter}</option>
              <option value="editor">{t.roleEditor}</option>
              <option value="admin">{t.roleAdmin}</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function BreakingPage() {
  const { t } = useI18n()
  const state = useAsync(() => api<{ data: { id: string; breaking: boolean; status: string; translations: { language: string; title: string }[] }[]; meta: PageMeta }>('/admin/articles?status=published&limit=50'), [])
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  return (
    <div>
      <h1 className="font-serif text-4xl">{t.breakingDesk}</h1>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">
        {state.data.data.map((article) => (
          <li key={article.id} className="flex items-center justify-between gap-3 p-3">
            <span>{article.translations.find((item) => item.language === 'en')?.title}</span>
            <label className="text-sm"><input type="checkbox" checked={article.breaking} onChange={async (event) => { await api(`/admin/articles/${article.id}`, { method: 'PATCH', body: JSON.stringify({ breaking: event.target.checked }) }); state.reload() }} /> {t.breakingFlag}</label>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LiveAdminPage() {
  const { t } = useI18n()
  const state = useAsync(() => api<{ data: { enabled: boolean; youtubeUrl: string | null; titleEn: string; titleHi: string; descriptionEn: string; descriptionHi: string } }>('/admin/live'), [])
  const [url, setUrl] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!state.data) return
    setUrl(state.data.data.youtubeUrl ?? '')
    setEnabled(state.data.data.enabled)
  }, [state.data])
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  return (
    <form className="max-w-xl space-y-3" onSubmit={async (event) => {
      event.preventDefault()
      setError('')
      try {
        await api('/admin/live', { method: 'PATCH', body: JSON.stringify({ enabled, youtubeUrl: url || null, titleEn: state.data?.data.titleEn, titleHi: state.data?.data.titleHi, descriptionEn: state.data?.data.descriptionEn, descriptionHi: state.data?.data.descriptionHi }) })
        state.reload()
      } catch (reason) { setError(reason instanceof ApiError ? reason.message : t.error) }
    }}>
      <h1 className="font-serif text-4xl">{t.liveSettings}</h1>
      <p className="text-sm text-muted">{t.noStream}</p>
      <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder={t.youtubeUrl} className="w-full rounded border border-line px-3 py-2" />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />{t.enableStream}</label>
      {error ? <p className="text-sm text-crimson">{error}</p> : null}
      <button className="rounded bg-navy px-3 py-2 text-paper" type="submit">{t.save}</button>
    </form>
  )
}

export function MediaPage() {
  const { t } = useI18n()
  const state = useAsync(() => api<{ data: { id: string; filename: string; mimeType: string; sizeBytes: number; kind: string }[]; meta: PageMeta }>('/admin/media?limit=20'), [])
  const [error, setError] = useState('')
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  return (
    <div>
      <h1 className="font-serif text-4xl">{t.media}</h1>
      <input type="file" className="mt-4" onChange={async (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        const body = new FormData()
        body.append('file', file)
        try { await api('/admin/media/upload', { method: 'POST', body }); state.reload() } catch (reason) { setError(reason instanceof ApiError ? reason.message : t.error) }
      }} />
      {error ? <p className="mt-2 text-sm text-crimson">{error}</p> : null}
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card">
        {state.data.data.map((asset) => (
          <li key={asset.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span>{asset.filename} · {asset.mimeType} · {asset.sizeBytes} B</span>
            <span className="flex gap-3">
              <a href={fileUrl(`/admin/media/${asset.id}/file`)}>{t.download}</a>
              <button type="button" className="text-crimson" onClick={async () => { await api(`/admin/media/${asset.id}`, { method: 'DELETE' }); state.reload() }}>{t.remove}</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AuditPage() {
  const { t } = useI18n()
  const state = useAsync(() => api<{ data: { id: string; action: string; entityType: string; createdAt: string; actorId: string | null }[] }>('/admin/audit-logs?limit=30'), [])
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  return (
    <div>
      <h1 className="font-serif text-4xl">{t.audit}</h1>
      <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-card text-sm">
        {state.data.data.map((entry) => (
          <li key={entry.id} className="grid gap-1 p-3 sm:grid-cols-[180px_1fr_180px]">
            <span className="font-semibold">{entry.action}</span>
            <span>{entry.entityType}</span>
            <time>{new Date(entry.createdAt).toLocaleString()}</time>
          </li>
        ))}
      </ul>
    </div>
  )
}
