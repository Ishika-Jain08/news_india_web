# Data model

Phase 1 stores one JSON document. The TypeScript shape is `DemoDatabase` in `packages/shared`. `demoDatabaseSchema` is the same shape as a Zod schema, and the repository refuses to save a document that fails it.

The document contains:

- `schemaVersion` — currently `1`.
- `users` — id, email, display names, bcrypt `passwordHash`, role, active flag, timestamps.
- `categories` — id, slug, English and Hindi name and description, sort order.
- `articles` — one record per story, with a `translations` array of one or two languages.
- `revisions` — short snapshots taken on create, update, and status changes.
- `media` — remote cover metadata and locally uploaded files.
- `live` — the single YouTube desk configuration. The seed leaves it disabled with a null URL.
- `breakingNews` — priority rows for articles flagged as breaking.
- `auditLogs` — actor, action, entity, and metadata. The service keeps the newest 1,000 entries.
- `contactMessages` — messages posted from the public contact form.

An article translation has its own slug. Slugs are unique across every translation. Hindi seed slugs use the English slug plus `-hi`. A public request can use either slug. The `language` query, or the `/en` or `/hi` site prefix, chooses which translation to render. If that language is missing, the API returns the other language and sets `translationMissing` to true.

Coverage rules:

- `local` requires `state` and `city`.
- `state` requires `state`.
- `national` may omit both.

Public article responses add `demo: true`. They never include drafts, submitted stories, approved stories, or rejected stories.

`database/schema.sql` splits translations into `article_translations` and keeps a primary category on `articles.category_id` plus a row in `article_categories`. Gallery items stay JSON. Tags stay a text array. Those scripts are the Phase 2 shape of this same model.
