import { useState } from 'react'
import { useI18n } from '../../app/providers'
import { usePageMeta } from '../../hooks/usePageMeta'
import { ApiError, api } from '../../services/api'

export function ContactPage() {
  const { lang, t } = useI18n()
  usePageMeta(`${t.navContact} — ${t.brand}`)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  return (
    <div className="max-w-xl">
      <h1 className="font-serif text-4xl">{t.contactTitle}</h1>
      <p className="mt-3 text-muted">{t.contactIntro}</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault()
          setError('')
          setNote('')
          try {
            await api('/contact', { method: 'POST', body: JSON.stringify({ name, email, message, language: lang }) })
            setNote(t.contactThanks)
            setMessage('')
          } catch (reason) {
            setError(reason instanceof ApiError ? reason.message : t.error)
          }
        }}
      >
        <Field label={t.contactName} value={name} onChange={setName} />
        <Field label={t.contactEmail} value={email} onChange={setEmail} type="email" />
        <label className="block text-sm font-semibold">{t.contactMessage}
          <textarea required minLength={10} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-2 font-normal" rows={5} />
        </label>
        {error ? <p className="text-sm text-crimson" role="alert">{error}</p> : null}
        {note ? <p className="text-sm text-navy" role="status">{note}</p> : null}
        <button type="submit" className="rounded bg-crimson px-4 py-2 font-semibold text-paper">{t.contactSend}</button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-sm font-semibold">{label}
      <input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-2 font-normal" />
    </label>
  )
}
