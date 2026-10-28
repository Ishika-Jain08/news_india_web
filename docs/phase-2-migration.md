# Phase 2 migration

Phase 2 has not been started. This note is the map for replacing the JSON file without rewriting the React app or the service rules.

## Repository files

Phase 1 storage is only these files:

- `apps/api/src/repositories/repository.ts` — `DataRepository` with `init`, `read`, `update`, and `resetFromSeed`.
- `apps/api/src/repositories/json-repository.ts` — the file-backed implementation and the single-process write queue.
- `apps/api/src/repositories/index.ts` — chooses the implementation. Today it accepts only `json` and throws otherwise.
- `apps/api/data/seed-data.json` — the immutable seed.
- `apps/api/data/demo-data.json` — the writable copy, created on first startup when it is missing.

Services never import `JsonDataRepository`. They receive a `DataRepository`:

- `article.service.ts`
- `auth.service.ts`
- `user.service.ts`
- `category.service.ts`
- `live.service.ts`
- `media.service.ts`
- `dashboard.service.ts`
- `contact.service.ts`

`createApp` in `apps/api/src/app.ts` constructs those services from the repository. The web app calls `/api/v1` only.

## PostgreSQL repository

Add `apps/api/src/repositories/postgres-repository.ts` that implements the same four methods. `read()` should return a `DemoDatabase` assembled from the tables in `database/schema.sql`, or the services should be split onto narrower repository methods that still hide SQL. Keep validation and status transitions in the services.

`createRepository` should branch on `DATA_PROVIDER`:

- `json` — current file repository.
- `postgres` — the new repository, using a new `DATABASE_URL`.

If initialization fails, throw. Do not catch that error and open the JSON file instead. Phase 1 already aborts when `DATA_PROVIDER` is anything other than `json`, which is the intended guard until the Postgres class exists and is tested.

## Importing the JSON demo

1. Create an empty database and run `database/schema.sql`.
2. Prefer `database/seed.sql` when the JSON file is still the generated seed.
3. When the writable demo file has editorial changes, write a one-off importer that reads `demo-data.json`, validates it with `demoDatabaseSchema`, and inserts rows in this order: users, categories, articles, article_translations, article_categories, media_assets, then `articles.original_pdf_id`, revisions, live_streams, breaking_news, audit_logs, contact_messages.

Preserve ids. Article ids stay the parent key. Each translation keeps its `article_id`, `language`, and `slug`. Category ids stay on `articles.category_id` and are also inserted into `article_categories`. Roles and statuses use the same enum labels as the TypeScript unions: `admin`, `editor`, `reporter` and `draft`, `submitted`, `approved`, `rejected`, `published`.

## Images

Article components read `coverImageUrl` and gallery URLs from the API. They do not call Unsplash. Phase 2 can add a media provider that uploads those remote URLs to Cloudinary and stores the Cloudinary URL on the article and on `media_assets`. The React `NewsImage` component can stay. Record that the current Unsplash URLs are demonstration references and were not licensed here for commercial use.

## PDFs

`LocalFileStorage` in `apps/api/src/services/storage.ts` is the only place that writes upload bytes. A Phase 2 `R2FileStorage` with the same `save`, `read`, and `remove` methods can replace it when the environment selects R2. Keep the download route authenticated. Do not add the upload directory as Express static middleware.

## Same frontend, either provider

Leave `VITE_API_BASE_URL` pointed at `/api/v1`. Switch `DATA_PROVIDER` on the API only. The response envelopes, slugs, and role names stay the same, so the existing pages exercise either provider. Run `npm test` against the JSON provider, then repeat the workflow test against Postgres before calling the switch complete.

## Authentication before production

The Phase 1 session store is `express-session` memory storage. It is lost on restart and is not shared across processes. Before production:

- replace it with a server-side session store
- set a unique `SESSION_SECRET` and `Secure` cookies behind HTTPS
- remove the seeded demo passwords
- keep CSRF checks on cookie-authenticated writes
- keep login rate limits
- stop returning demo credentials in the login page
- review the helmet and CORS origin settings for the real public origin

Do not treat the development cookie settings as a production configuration.
