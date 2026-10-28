import { INDIAN_STATES } from '@news-india/shared'
import type { Language } from './i18n'

export function formatDate(iso: string | undefined, lang: Language) {
  if (!iso) return ''
  return new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso))
}

export function stateLabel(state: string | undefined, lang: Language) {
  if (!state) return ''
  if (lang === 'en') return state
  return INDIAN_STATES.find((item) => item.en === state)?.hi ?? state
}

export function cityLabel(city: string | undefined, cityHi: string | undefined, lang: Language) {
  if (!city && !cityHi) return ''
  return lang === 'hi' ? cityHi || city || '' : city || ''
}
