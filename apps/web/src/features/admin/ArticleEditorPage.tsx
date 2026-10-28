import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth, useI18n } from '../../app/providers'
import { ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { ApiError, api, fileUrl } from '../../services/api'

interface Translation { language: 'en' | 'hi'; title: string; summary: string; body: string; slug?: string }
interface ArticleRecord {
  id: string
  authorId: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'published'
  coverage: 'local' | 'state' | 'national'
  state?: string
  city?: string
  categoryId: string
  tags: string[]
  featured: boolean
  breaking: boolean
  coverImageUrl?: string
  rejectionReason?: string
  translations: Translation[]
}
interface Category { id: string; nameEn: string; nameHi: string }

const empty = { title: '', summary: '', body: '' }

export function ArticleEditorPage() {
  const { id } = useParams()
  const isNew = !id
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [article, setArticle] = useState<ArticleRecord | null>(null)
  const [en, setEn] = useState(empty)
  const [hi, setHi] = useState(empty)
  const [coverage, setCoverage] = useState<'local' | 'state' | 'national'>('national')
  const [categoryId, setCategoryId] = useState('')
  const [stateName, setStateName] = useState('')
  const [city, setCity] = useState('')
  const [tags, setTags] = useState('')
  const [cover, setCover] = useState('')
  const [featured, setFeatured] = useState(false)
  const [breaking, setBreaking] = useState(false)
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(!isNew)

  useEffect(() => {
    api<{ data: Category[] }>('/admin/categories').then((result) => {
      setCategories(result.data)
      if (!id && result.data[0]) setCategoryId(result.data[0].id)
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : t.error))
  }, [id, t.error])

  useEffect(() => {
    if (!id) return
    api<{ data: { article: ArticleRecord } }>(`/admin/articles/${id}`).then((result) => {
      const current = result.data.article
      setArticle(current)
      setEn(current.translations.find((item) => item.language === 'en') ?? empty)
      setHi(current.translations.find((item) => item.language === 'hi') ?? empty)
      setCoverage(current.coverage)
      setCategoryId(current.categoryId)
      setStateName(current.state ?? '')
      setCity(current.city ?? '')
      setTags(current.tags.join(', '))
      setCover(current.coverImageUrl ?? '')
      setFeatured(current.featured)
      setBreaking(current.breaking)
      setLoading(false)
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : t.error)
      setLoading(false)
    })
  }, [id, t.error])

  function payload() {
    const translations = [
      { ...en, language: 'en' as const },
      ...(hi.title.trim() ? [{ ...hi, language: 'hi' as const }] : []),
    ]
    return {
      translations,
      categoryId,
      coverage,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      ...(stateName ? { state: stateName } : {}),
      ...(city ? { city } : {}),
      ...(cover ? { coverImageUrl: cover } : {}),
      featured,
      breaking,
    }
  }

  async function run(action: () => Promise<void>) {
    setError('')
    setMessage('')
    try {
      await action()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : t.error)
    }
  }

  if (loading) return <LoadingBlock />
  if (!isNew && !article && error) return <ErrorBlock message={error} />
  const status = article?.status
  const canEdit = user?.role === 'admin' || user?.role === 'editor' || status === 'draft' || status === 'rejected' || isNew
  return (
    <div className="max-w-3xl">
      <p className="text-sm text-muted"><Link to="/admin/articles">{t.articles}</Link></p>
      <h1 className="font-serif text-4xl">{isNew ? t.newArticle : t.open}</h1>
      {status ? <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-crimson">{t[status]}</p> : null}
      {article?.rejectionReason ? <p className="mt-2 text-sm">{t.rejectionReason}: {article.rejectionReason}</p> : null}
      <form className="mt-4 space-y-4" onSubmit={(event) => event.preventDefault()}>
        <h2 className="font-serif text-2xl">{t.english}</h2>
        <Field label={t.title} value={en.title} onChange={(title) => setEn({ ...en, title })} />
        <Field label={t.summary} value={en.summary} onChange={(summary) => setEn({ ...en, summary })} area />
        <Field label={t.body} value={en.body} onChange={(body) => setEn({ ...en, body })} area />
        <h2 className="font-serif text-2xl">{t.hindi}</h2>
        <Field label={t.title} value={hi.title} onChange={(title) => setHi({ ...hi, title })} />
        <Field label={t.summary} value={hi.summary} onChange={(summary) => setHi({ ...hi, summary })} area />
        <Field label={t.body} value={hi.body} onChange={(body) => setHi({ ...hi, body })} area />
        <label className="block text-sm font-semibold">{t.category}
          <select className="mt-1 w-full rounded border border-line px-3 py-2 font-normal" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {categories.map((category) => <option key={category.id} value={category.id}>{lang === 'hi' ? category.nameHi : category.nameEn}</option>)}
          </select>
        </label>
        <label className="block text-sm font-semibold">{t.coverage}
          <select className="mt-1 w-full rounded border border-line px-3 py-2 font-normal" value={coverage} onChange={(event) => setCoverage(event.target.value as typeof coverage)}>
            <option value="local">{t.local}</option>
            <option value="state">{t.state}</option>
            <option value="national">{t.national}</option>
          </select>
        </label>
        <Field label={t.stateLabel} value={stateName} onChange={setStateName} />
        <Field label={t.city} value={city} onChange={setCity} />
        <Field label={t.tags} value={tags} onChange={setTags} />
        <Field label={t.cover} value={cover} onChange={setCover} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />{t.featuredFlag}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={breaking} onChange={(event) => setBreaking(event.target.checked)} />{t.breakingFlag}</label>
        {error ? <p className="text-sm text-crimson" role="alert">{error}</p> : null}
        {message ? <p className="text-sm text-navy" role="status">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          {canEdit ? <button type="button" className="rounded bg-navy px-3 py-2 text-sm text-paper" onClick={() => run(async () => {
            if (isNew) {
              const created = await api<{ data: { id: string } }>('/admin/articles', { method: 'POST', body: JSON.stringify(payload()) })
              navigate(`/admin/articles/${created.data.id}`)
            } else {
              await api(`/admin/articles/${id}`, { method: 'PATCH', body: JSON.stringify(payload()) })
              setMessage(t.saved)
            }
          })}>{t.save}</button> : null}
          {id && (status === 'draft' || status === 'rejected') ? <Action label={t.submit} onClick={() => run(async () => { await api(`/admin/articles/${id}/submit`, { method: 'POST' }); window.location.assign(`/admin/articles/${id}`) })} /> : null}
          {id && user && user.role !== 'reporter' && status === 'submitted' ? <Action label={t.approve} onClick={() => run(async () => { await api(`/admin/articles/${id}/approve`, { method: 'POST' }); window.location.assign(`/admin/articles/${id}`) })} /> : null}
          {id && user && user.role !== 'reporter' && status === 'approved' ? <Action label={t.publish} onClick={() => run(async () => { await api(`/admin/articles/${id}/publish`, { method: 'POST' }); window.location.assign(`/admin/articles/${id}`) })} /> : null}
          {id && user && user.role !== 'reporter' && status === 'published' ? <Action label={t.unpublish} onClick={() => run(async () => { await api(`/admin/articles/${id}/unpublish`, { method: 'POST' }); window.location.assign(`/admin/articles/${id}`) })} /> : null}
          {id ? <a className="rounded border border-line px-3 py-2 text-sm" href={fileUrl(`/admin/articles/${id}/pdf?language=${lang}`)}>{t.downloadPdf}</a> : null}
          {id && user && (user.role === 'admin' || (user.role === 'editor' && status !== 'published') || (user.id === article?.authorId && (status === 'draft' || status === 'rejected'))) ? (
            <button type="button" className="rounded border border-crimson px-3 py-2 text-sm text-crimson" onClick={() => run(async () => {
              await api(`/admin/articles/${id}`, { method: 'DELETE' })
              navigate('/admin/articles')
            })}>{t.delete}</button>
          ) : null}
        </div>
        {id && user && user.role !== 'reporter' && status === 'submitted' ? (
          <div className="flex gap-2">
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t.reason} className="flex-1 rounded border border-line px-3 py-2" />
            <button type="button" className="rounded border border-crimson px-3 py-2 text-sm text-crimson" onClick={() => run(async () => { await api(`/admin/articles/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }); window.location.assign(`/admin/articles/${id}`) })}>{t.reject}</button>
          </div>
        ) : null}
        {id ? (
          <label className="block text-sm font-semibold">{t.originalPdf}
            <input type="file" accept="application/pdf" className="mt-1 block font-normal" onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              const body = new FormData()
              body.append('file', file)
              run(async () => { await api(`/admin/articles/${id}/original-pdf`, { method: 'POST', body }); setMessage(t.saved) })
            }} />
          </label>
        ) : null}
      </form>
    </div>
  )
}

function Field({ label, value, onChange, area = false }: { label: string; value: string; onChange: (value: string) => void; area?: boolean }) {
  const className = 'mt-1 w-full rounded border border-line px-3 py-2 font-normal'
  return (
    <label className="block text-sm font-semibold">{label}
      {area ? <textarea value={value} onChange={(event) => onChange(event.target.value)} className={className} rows={label.toLowerCase().includes('body') || label.includes('विवरण') ? 8 : 3} /> : <input value={value} onChange={(event) => onChange(event.target.value)} className={className} />}
    </label>
  )
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded border border-line px-3 py-2 text-sm">{label}</button>
}
