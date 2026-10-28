import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { DEMO_ACCOUNTS, SCHEMA_VERSION, demoDatabaseSchema, type DemoDatabase } from '../packages/shared/src/index.ts'
import { STORIES } from './sample-stories.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const anchor = new Date('2026-10-26T04:30:00.000Z')

const DISCLAIMER_EN =
  'This story is fictional sample content created for the News India product demonstration. It is not a report of a real event.'
const DISCLAIMER_HI =
  'यह कहानी न्यूज़ इंडिया उत्पाद प्रदर्शन के लिए लिखी गई काल्पनिक सामग्री है। यह किसी वास्तविक घटना की रिपोर्ट नहीं है।'

export const DEMO_IMAGES = [
  'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&h=900&q=80',
  'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1532375810709-75b1da00537c?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&h=900&q=80',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1400&h=900&q=80',
]

const CATEGORIES = [
  ['politics', 'Politics', 'राजनीति', 'Sample political desk notes for the demonstration.', 'प्रदर्शन के लिए नमूना राजनीतिक डेस्क नोट्स।'],
  ['business', 'Business', 'कारोबार', 'Sample business desk stories about classroom markets and fairs.', 'कक्षा बाजारों और मेलों की नमूना कारोबार कथाएँ।'],
  ['sports', 'Sports', 'खेल', 'Fictional friendly matches and camp sheets.', 'काल्पनिक दोस्ताना मैच और शिविर सूचियाँ।'],
  ['technology', 'Technology', 'तकनीक', 'Sample tools, timetables, and classroom builds.', 'नमूना उपकरण, समय-सारणियाँ और कक्षा निर्माण।'],
  ['culture', 'Culture', 'संस्कृति', 'Fictional fairs, archives, and neighbourhood rehearsals.', 'काल्पनिक मेले, संग्रह और मोहल्ले के अभ्यास।'],
  ['environment', 'Environment', 'पर्यावरण', 'Sample drills about water, shade, and cleanups.', 'पानी, छाया और सफाई के नमूना अभ्यास।'],
  ['education', 'Education', 'शिक्षा', 'Fictional libraries, fairs, and classroom hours.', 'काल्पनिक पुस्तकालय, मेले और कक्षा घंटे।'],
  ['health', 'Health', 'स्वास्थ्य', 'Sample checklists from the demonstration health desk.', 'प्रदर्शन स्वास्थ्य डेस्क की नमूना जाँच सूचियाँ।'],
  ['agriculture', 'Agriculture', 'कृषि', 'Fictional harvest tables and farm-club workshops.', 'काल्पनिक फसल मेज़ और कृषि क्लब कार्यशालाएँ।'],
  ['science', 'Science', 'विज्ञान', 'Sample exhibits, models, and star-chart nights.', 'नमूना प्रदर्शनियाँ, मॉडल और तारा-मानचित्र रातें।'],
] as const

function id(group: number, n: number) {
  return `${group.toString(16).padStart(8, '0')}-0000-4000-8000-${n.toString().padStart(12, '0')}`
}

function isoDaysAgo(days: number) {
  return new Date(anchor.getTime() - days * 86_400_000).toISOString()
}

function sqlText(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

function sqlJson(value: unknown) {
  return `${sqlText(JSON.stringify(value))}::jsonb`
}

async function main() {
  const now = isoDaysAgo(0)
  const users = await Promise.all(
    DEMO_ACCOUNTS.map(async (account, index) => ({
      id: id(1, index + 1),
      email: account.email,
      name: account.name,
      nameHi: account.nameHi,
      passwordHash: bcrypt.hashSync(account.password, 10),
      role: account.role,
      active: true,
      createdAt: isoDaysAgo(40),
      updatedAt: now,
    })),
  )
  const userId = Object.fromEntries(users.map((user) => [user.role, user.id])) as Record<string, string>

  const categories = CATEGORIES.map((category, index) => ({
    id: id(2, index + 1),
    slug: category[0],
    nameEn: category[1],
    nameHi: category[2],
    descriptionEn: category[3],
    descriptionHi: category[4],
    sortOrder: index + 1,
    createdAt: isoDaysAgo(40),
    updatedAt: now,
  }))
  const categoryId = Object.fromEntries(categories.map((category) => [category.slug, category.id]))

  const articles = STORIES.map((story, index) => {
    const published = story.status === 'published'
    const createdAt = isoDaysAgo(story.daysAgo + 2)
    const updatedAt = isoDaysAgo(story.daysAgo)
    const translations = [
      {
        language: 'en' as const,
        title: story.enTitle,
        summary: story.enSummary,
        body: `${story.enBody[0]}\n\n${story.enBody[1]}\n\n${DISCLAIMER_EN}`,
        slug: story.slug,
        seoTitle: story.enTitle,
        seoDescription: story.enSummary,
      },
    ]
    if (!story.englishOnly && story.hiTitle && story.hiSummary && story.hiBody) {
      translations.push({
        language: 'hi' as const,
        title: story.hiTitle,
        summary: story.hiSummary,
        body: `${story.hiBody[0]}\n\n${story.hiBody[1]}\n\n${DISCLAIMER_HI}`,
        slug: `${story.slug}-hi`,
        seoTitle: story.hiTitle,
        seoDescription: story.hiSummary,
      })
    }
    return {
      id: id(3, index + 1),
      status: story.status,
      coverage: story.coverage,
      ...(story.state ? { state: story.state } : {}),
      ...(story.city ? { city: story.city } : {}),
      ...(story.cityHi ? { cityHi: story.cityHi } : {}),
      ...(story.locality ? { locality: story.locality } : {}),
      categoryId: categoryId[story.category]!,
      tags: story.tags,
      authorId: userId[story.author]!,
      coverImageUrl: DEMO_IMAGES[story.image % DEMO_IMAGES.length]!,
      coverImageAltEn: `Sample photo used with the demonstration story: ${story.enTitle}`,
      coverImageAltHi: story.hiTitle ? `प्रदर्शन कथा के साथ लगी नमूना तस्वीर: ${story.hiTitle}` : 'प्रदर्शन कथा के साथ लगी नमूना तस्वीर',
      gallery: (story.gallery ?? []).map((image, galleryIndex) => ({
        url: DEMO_IMAGES[image % DEMO_IMAGES.length]!,
        altEn: `Sample gallery image ${galleryIndex + 1} for ${story.enTitle}`,
        altHi: `नमूना गैलरी चित्र ${galleryIndex + 1}`,
      })),
      featured: Boolean(story.featured),
      breaking: Boolean(story.breaking),
      trendingBoost: story.boost ?? 0,
      sourceName: 'News India Sample Desk',
      ...(story.correction
        ? {
            correctionNoteEn: 'An earlier demo sentence named the wrong classroom jetty. This sample now names the Fort Kochi model only.',
            correctionNoteHi: 'डेमो का एक पहले वाला वाक्य गलत कक्षा-घाट बताता था। यह नमूना अब केवल फोर्ट कोच्चि मॉडल का नाम लेता है।',
            correctedAt: updatedAt,
          }
        : {}),
      ...(story.rejectionReason ? { rejectionReason: story.rejectionReason } : {}),
      viewCount: story.views,
      ...(published ? { publishedAt: updatedAt } : {}),
      createdAt,
      updatedAt,
      translations,
    }
  })

  const breakingNews = STORIES.flatMap((story, index) => {
    if (!story.breaking) return []
    return [
      {
        id: id(6, index + 1),
        articleId: id(3, index + 1),
        priority: story.priority ?? 1,
        active: true,
        createdAt: isoDaysAgo(story.daysAgo),
      },
    ]
  })

  const revisions = articles.slice(0, 3).map((article, index) => ({
    id: id(4, index + 1),
    articleId: article.id,
    editorId: userId.editor!,
    action: 'seed',
    createdAt: article.updatedAt,
    snapshot: {
      status: article.status,
      translations: article.translations.map((translation) => ({
        language: translation.language,
        title: translation.title,
        slug: translation.slug,
      })),
    },
  }))

  const media = articles.slice(0, 4).map((article, index) => ({
    id: id(5, index + 1),
    kind: 'image' as const,
    source: 'remote' as const,
    filename: `remote-cover-${index + 1}.jpg`,
    originalName: `demo-cover-${index + 1}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 0,
    url: article.coverImageUrl,
    uploadedBy: userId.admin!,
    articleId: article.id,
    createdAt: article.createdAt,
  }))

  const database: DemoDatabase = {
    schemaVersion: SCHEMA_VERSION,
    users,
    categories,
    articles,
    revisions,
    media,
    live: {
      id: id(8, 1),
      enabled: false,
      youtubeUrl: null,
      youtubeId: null,
      titleEn: 'News India live desk',
      titleHi: 'न्यूज़ इंडिया लाइव डेस्क',
      descriptionEn:
        'No demonstration stream is configured. A producer can add a YouTube URL from the newsroom dashboard. This page will not pretend a video is live.',
      descriptionHi:
        'कोई प्रदर्शन स्ट्रीम सेट नहीं है। निर्माता न्यूज़रूम डैशबोर्ड से यूट्यूब पता जोड़ सकता है। यह पृष्ठ किसी वीडियो को लाइव बताकर नहीं दिखाएगा।',
      updatedAt: now,
      updatedBy: userId.admin!,
    },
    breakingNews,
    auditLogs: [
      {
        id: id(7, 1),
        actorId: userId.admin!,
        action: 'seed.loaded',
        entityType: 'system',
        entityId: null,
        metadata: { articles: articles.length, note: 'Initial demonstration seed' },
        createdAt: now,
      },
    ],
    contactMessages: [],
  }

  const parsed = demoDatabaseSchema.parse(database)
  const statuses = new Set(parsed.articles.map((article) => article.status))
  for (const status of ['draft', 'submitted', 'approved', 'rejected', 'published'] as const) {
    if (!statuses.has(status)) throw new Error(`Seed is missing status ${status}`)
  }
  if (parsed.articles.length < 30) throw new Error('Seed needs at least 30 articles')
  const hindi = parsed.articles.filter((article) => article.translations.some((item) => item.language === 'hi')).length
  if (hindi < 30) throw new Error('Seed needs Hindi translations on at least 30 articles')

  const jsonPath = path.join(root, 'apps', 'api', 'data', 'seed-data.json')
  const sqlPath = path.join(root, 'database', 'seed.sql')
  await mkdir(path.dirname(jsonPath), { recursive: true })
  await mkdir(path.dirname(sqlPath), { recursive: true })
  await writeFile(jsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8')
  await writeFile(sqlPath, buildSeedSql(parsed), 'utf8')
  console.log(`Wrote ${parsed.articles.length} articles to ${jsonPath}`)
}

function buildSeedSql(db: DemoDatabase) {
  const lines: string[] = []
  lines.push('-- News India demonstration seed. Run after schema.sql on an empty database.')
  lines.push('BEGIN;')
  lines.push('')
  for (const user of db.users) {
    lines.push(
      `INSERT INTO users (id, email, name, name_hi, password_hash, role, active, created_at, updated_at) VALUES (${sqlText(user.id)}::uuid, ${sqlText(user.email)}, ${sqlText(user.name)}, ${sqlText(user.nameHi)}, ${sqlText(user.passwordHash)}, ${sqlText(user.role)}::user_role, ${user.active}, ${sqlText(user.createdAt)}::timestamptz, ${sqlText(user.updatedAt)}::timestamptz);`,
    )
  }
  lines.push('')
  for (const category of db.categories) {
    lines.push(
      `INSERT INTO categories (id, slug, name_en, name_hi, description_en, description_hi, sort_order, created_at, updated_at) VALUES (${sqlText(category.id)}::uuid, ${sqlText(category.slug)}, ${sqlText(category.nameEn)}, ${sqlText(category.nameHi)}, ${sqlText(category.descriptionEn)}, ${sqlText(category.descriptionHi)}, ${category.sortOrder}, ${sqlText(category.createdAt)}::timestamptz, ${sqlText(category.updatedAt)}::timestamptz);`,
    )
  }
  lines.push('')
  for (const article of db.articles) {
    lines.push(
      `INSERT INTO articles (id, status, coverage, state, city, city_hi, locality, category_id, tags, author_id, cover_image_url, cover_image_alt_en, cover_image_alt_hi, gallery, featured, breaking, trending_boost, source_name, source_url, correction_note_en, correction_note_hi, corrected_at, rejection_reason, view_count, published_at, created_at, updated_at) VALUES (${sqlText(article.id)}::uuid, ${sqlText(article.status)}::article_status, ${sqlText(article.coverage)}::coverage_level, ${article.state ? sqlText(article.state) : 'NULL'}, ${article.city ? sqlText(article.city) : 'NULL'}, ${article.cityHi ? sqlText(article.cityHi) : 'NULL'}, ${article.locality ? sqlText(article.locality) : 'NULL'}, ${sqlText(article.categoryId)}::uuid, ARRAY[${article.tags.map(sqlText).join(', ')}]::text[], ${sqlText(article.authorId)}::uuid, ${article.coverImageUrl ? sqlText(article.coverImageUrl) : 'NULL'}, ${article.coverImageAltEn ? sqlText(article.coverImageAltEn) : 'NULL'}, ${article.coverImageAltHi ? sqlText(article.coverImageAltHi) : 'NULL'}, ${sqlJson(article.gallery)}, ${article.featured}, ${article.breaking}, ${article.trendingBoost}, ${article.sourceName ? sqlText(article.sourceName) : 'NULL'}, ${article.sourceUrl ? sqlText(article.sourceUrl) : 'NULL'}, ${article.correctionNoteEn ? sqlText(article.correctionNoteEn) : 'NULL'}, ${article.correctionNoteHi ? sqlText(article.correctionNoteHi) : 'NULL'}, ${article.correctedAt ? `${sqlText(article.correctedAt)}::timestamptz` : 'NULL'}, ${article.rejectionReason ? sqlText(article.rejectionReason) : 'NULL'}, ${article.viewCount}, ${article.publishedAt ? `${sqlText(article.publishedAt)}::timestamptz` : 'NULL'}, ${sqlText(article.createdAt)}::timestamptz, ${sqlText(article.updatedAt)}::timestamptz);`,
    )
    lines.push(
      `INSERT INTO article_categories (article_id, category_id) VALUES (${sqlText(article.id)}::uuid, ${sqlText(article.categoryId)}::uuid);`,
    )
    for (const translation of article.translations) {
      lines.push(
        `INSERT INTO article_translations (article_id, language, title, summary, body, slug, seo_title, seo_description) VALUES (${sqlText(article.id)}::uuid, ${sqlText(translation.language)}::content_language, ${sqlText(translation.title)}, ${sqlText(translation.summary)}, ${sqlText(translation.body)}, ${sqlText(translation.slug)}, ${translation.seoTitle ? sqlText(translation.seoTitle) : 'NULL'}, ${translation.seoDescription ? sqlText(translation.seoDescription) : 'NULL'});`,
      )
    }
  }
  lines.push('')
  for (const revision of db.revisions) {
    lines.push(
      `INSERT INTO article_revisions (id, article_id, editor_id, action, snapshot, created_at) VALUES (${sqlText(revision.id)}::uuid, ${sqlText(revision.articleId)}::uuid, ${revision.editorId ? `${sqlText(revision.editorId)}::uuid` : 'NULL'}, ${sqlText(revision.action)}, ${sqlJson(revision.snapshot)}, ${sqlText(revision.createdAt)}::timestamptz);`,
    )
  }
  for (const asset of db.media) {
    lines.push(
      `INSERT INTO media_assets (id, kind, source, filename, original_name, mime_type, size_bytes, url, storage_key, uploaded_by, article_id, created_at) VALUES (${sqlText(asset.id)}::uuid, ${sqlText(asset.kind)}::media_kind, ${sqlText(asset.source)}::media_source, ${sqlText(asset.filename)}, ${sqlText(asset.originalName)}, ${sqlText(asset.mimeType)}, ${asset.sizeBytes}, ${asset.url ? sqlText(asset.url) : 'NULL'}, ${asset.storageKey ? sqlText(asset.storageKey) : 'NULL'}, ${asset.uploadedBy ? `${sqlText(asset.uploadedBy)}::uuid` : 'NULL'}, ${asset.articleId ? `${sqlText(asset.articleId)}::uuid` : 'NULL'}, ${sqlText(asset.createdAt)}::timestamptz);`,
    )
  }
  const live = db.live
  lines.push(
    `INSERT INTO live_streams (id, enabled, youtube_url, youtube_id, title_en, title_hi, description_en, description_hi, is_current, updated_at, updated_by) VALUES (${sqlText(live.id)}::uuid, ${live.enabled}, ${live.youtubeUrl ? sqlText(live.youtubeUrl) : 'NULL'}, ${live.youtubeId ? sqlText(live.youtubeId) : 'NULL'}, ${sqlText(live.titleEn)}, ${sqlText(live.titleHi)}, ${sqlText(live.descriptionEn)}, ${sqlText(live.descriptionHi)}, TRUE, ${sqlText(live.updatedAt)}::timestamptz, ${live.updatedBy ? `${sqlText(live.updatedBy)}::uuid` : 'NULL'});`,
  )
  for (const item of db.breakingNews) {
    lines.push(
      `INSERT INTO breaking_news (id, article_id, priority, active, created_at) VALUES (${sqlText(item.id)}::uuid, ${sqlText(item.articleId)}::uuid, ${item.priority}, ${item.active}, ${sqlText(item.createdAt)}::timestamptz);`,
    )
  }
  for (const entry of db.auditLogs) {
    lines.push(
      `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (${sqlText(entry.id)}::uuid, ${entry.actorId ? `${sqlText(entry.actorId)}::uuid` : 'NULL'}, ${sqlText(entry.action)}, ${sqlText(entry.entityType)}, ${entry.entityId ? `${sqlText(entry.entityId)}::uuid` : 'NULL'}, ${sqlJson(entry.metadata)}, ${sqlText(entry.createdAt)}::timestamptz);`,
    )
  }
  lines.push('')
  lines.push('COMMIT;')
  lines.push('')
  return lines.join('\n')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
