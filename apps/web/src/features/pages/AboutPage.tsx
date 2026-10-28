import { useI18n } from '../../app/providers'
import { usePageMeta } from '../../hooks/usePageMeta'

export function AboutPage() {
  const { t } = useI18n()
  usePageMeta(`${t.navAbout} — ${t.brand}`)
  return (
    <article className="max-w-3xl">
      <h1 className="font-serif text-4xl">{t.aboutTitle}</h1>
      <p className="mt-4 text-lg leading-8">{t.aboutBody}</p>
      <p className="mt-4 text-lg leading-8">{t.footerNote}</p>
    </article>
  )
}
