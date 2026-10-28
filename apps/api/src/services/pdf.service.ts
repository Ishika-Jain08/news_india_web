import { createCanvas, GlobalFonts } from '@napi-rs/canvas'
import { PDFDocument } from 'pdf-lib'
import type { Article, Language } from '@news-india/shared'
import { apiRoot } from '../lib/paths.js'
import path from 'node:path'

const PAGE_W = 1190
const PAGE_H = 1684
const MARGIN = 86
let fontReady = false

export function ensurePdfFont() {
  if (fontReady) return
  const fontPath = path.join(apiRoot(), 'assets', 'fonts', 'NotoSansDevanagari-Regular.ttf')
  GlobalFonts.registerFromPath(fontPath, 'NotoSansDevanagari')
  fontReady = true
}

interface Line {
  text: string
  size: number
  color: string
  gap: number
}

function wrap(text: string, size: number, color: string, gap: number, maxWidth: number): Line[] {
  ensurePdfFont()
  const canvas = createCanvas(10, 10)
  const ctx = canvas.getContext('2d')
  ctx.font = `${size}px NotoSansDevanagari`
  const lines: Line[] = []
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push({ text: '', size: 12, color, gap: 8 })
      continue
    }
    let current = ''
    for (const word of words) {
      const trial = current ? `${current} ${word}` : word
      if (ctx.measureText(trial).width <= maxWidth) current = trial
      else {
        if (current) lines.push({ text: current, size, color, gap })
        current = word
      }
    }
    if (current) lines.push({ text: current, size, color, gap })
    lines.push({ text: '', size: 10, color, gap: 6 })
  }
  return lines
}

function drawPage(lines: Line[], pageNumber: number, pageCount: number) {
  const canvas = createCanvas(PAGE_W, PAGE_H)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fffdf8'
  ctx.fillRect(0, 0, PAGE_W, PAGE_H)
  ctx.fillStyle = '#9f1d1d'
  ctx.fillRect(0, 0, PAGE_W, 92)
  ctx.fillStyle = '#fffdf8'
  ctx.font = '36px NotoSansDevanagari'
  ctx.textBaseline = 'top'
  ctx.fillText('NEWS INDIA', MARGIN, 28)
  ctx.font = '18px NotoSansDevanagari'
  ctx.fillText('SAMPLE  ·  डेमो', PAGE_W - 280, 36)
  let y = 130
  ctx.textBaseline = 'top'
  for (const line of lines) {
    ctx.fillStyle = line.color
    ctx.font = `${line.size}px NotoSansDevanagari`
    if (line.text) ctx.fillText(line.text, MARGIN, y)
    y += Math.round(line.size * 1.4) + line.gap
  }
  ctx.fillStyle = '#6b6258'
  ctx.font = '16px NotoSansDevanagari'
  ctx.fillText(`News India demonstration  ·  ${pageNumber} / ${pageCount}`, MARGIN, PAGE_H - 56)
  return canvas.toBuffer('image/png')
}

export async function renderArticlePdf(article: Article, language: Language): Promise<Buffer> {
  ensurePdfFont()
  const translation = article.translations.find((item) => item.language === language) ?? article.translations[0]
  if (!translation) throw new Error('Article has no translation')
  const maxWidth = PAGE_W - MARGIN * 2
  const lines: Line[] = [
    ...wrap(translation.language === 'hi' ? 'नमूना समाचार' : 'Sample news article', 18, '#9f1d1d', 8, maxWidth),
    ...wrap(translation.title, 40, '#1a1714', 10, maxWidth),
    ...wrap(translation.summary, 22, '#3f3a34', 12, maxWidth),
    ...wrap(translation.body, 22, '#1a1714', 4, maxWidth),
  ]
  const pages: Line[][] = []
  let bucket: Line[] = []
  let used = 0
  const limit = PAGE_H - 240
  for (const line of lines) {
    const height = Math.round(line.size * 1.4) + line.gap
    if (used + height > limit && bucket.length > 0) {
      pages.push(bucket)
      bucket = []
      used = 0
    }
    bucket.push(line)
    used += height
  }
  if (bucket.length > 0) pages.push(bucket)
  const pngs = pages.map((page, index) => drawPage(page, index + 1, pages.length))
  const pdf = await PDFDocument.create()
  pdf.setTitle(translation.title)
  pdf.setAuthor('News India Sample Desk')
  pdf.setLanguage(translation.language === 'hi' ? 'hi-IN' : 'en-IN')
  pdf.setSubject('Fictional demonstration article')
  pdf.setCreator('News India Phase 1')
  for (const png of pngs) {
    const page = pdf.addPage([595.28, 841.89])
    const image = await pdf.embedPng(png)
    page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 })
  }
  return Buffer.from(await pdf.save())
}

export function renderTextProbe(text: string): number {
  ensurePdfFont()
  const canvas = createCanvas(480, 140)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 480, 140)
  ctx.fillStyle = '#111111'
  ctx.font = '42px NotoSansDevanagari'
  ctx.textBaseline = 'top'
  ctx.fillText(text, 12, 36)
  const data = ctx.getImageData(12, 36, 360, 70).data
  let dark = 0
  for (let index = 0; index < data.length; index += 4) {
    if (data[index]! < 250) dark += 1
  }
  return dark
}
