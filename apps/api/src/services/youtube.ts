import { AppError } from '../lib/errors.js'

const VIDEO_ID = /^[a-zA-Z0-9_-]{11}$/

export interface YoutubeRef {
  youtubeUrl: string | null
  youtubeId: string | null
}

export function parseYoutubeInput(input: string | null | undefined): YoutubeRef {
  if (input == null || input.trim() === '') return { youtubeUrl: null, youtubeId: null }
  const value = input.trim()
  if (VIDEO_ID.test(value)) {
    return { youtubeUrl: `https://www.youtube.com/watch?v=${value}`, youtubeId: value }
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new AppError(400, 'INVALID_YOUTUBE_URL', 'Enter a YouTube watch, live, embed, or youtu.be URL, or an 11-character video id.')
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const allowed = new Set(['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'])
  if (!allowed.has(host)) {
    throw new AppError(400, 'INVALID_YOUTUBE_URL', 'Only YouTube URLs can be saved on the live desk.')
  }
  let id: string | null = null
  if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? null
  else if (url.pathname === '/watch') id = url.searchParams.get('v')
  else if (url.pathname.startsWith('/live/')) id = url.pathname.split('/')[2] ?? null
  else if (url.pathname.startsWith('/embed/')) id = url.pathname.split('/')[2] ?? null
  else if (url.pathname.startsWith('/shorts/')) id = url.pathname.split('/')[2] ?? null
  if (!id || !VIDEO_ID.test(id)) {
    throw new AppError(400, 'INVALID_YOUTUBE_URL', 'That YouTube URL does not include a valid video id.')
  }
  return { youtubeUrl: `https://www.youtube.com/watch?v=${id}`, youtubeId: id }
}
