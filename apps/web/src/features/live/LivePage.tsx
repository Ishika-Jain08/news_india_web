import type { PublicLive } from '@news-india/shared'
import { useI18n } from '../../app/providers'
import { EmptyBlock, ErrorBlock, LoadingBlock } from '../../components/common/StateMessage'
import { useAsync } from '../../hooks/useAsync'
import { usePageMeta } from '../../hooks/usePageMeta'
import { api } from '../../services/api'

export function LivePage() {
  const { lang, t } = useI18n()
  usePageMeta(`${t.liveDesk} — ${t.brand}`)
  const state = useAsync(() => api<{ data: PublicLive }>(`/live/current?language=${lang}`), [lang])
  if (state.status === 'loading') return <LoadingBlock />
  if (state.status === 'error' || !state.data) return <ErrorBlock message={state.error ?? undefined} onRetry={state.reload} />
  const live = state.data.data
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-crimson">{t.sampleLabel}</p>
      <h1 className="font-serif text-4xl">{live.title || t.liveDesk}</h1>
      <p className="mt-3 max-w-2xl text-muted">{live.configured ? t.configuredStream : live.description || t.noStream}</p>
      {live.configured && live.youtubeId ? (
        <div className="mt-6 aspect-video overflow-hidden rounded-xl border border-line bg-black">
          <iframe
            title={live.title}
            src={`https://www.youtube.com/embed/${live.youtubeId}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : <div className="mt-6"><EmptyBlock>{t.noStream}</EmptyBlock></div>}
    </div>
  )
}
