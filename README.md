# News India

News India is a bilingual demonstration newsroom. Readers can browse fictional sample stories in English and Hindi. Reporters, editors, and admins sign in to a newsroom that creates, reviews, and publishes those stories through a real API.

This repository is Phase 1. Stories, users, and uploads are stored in a JSON file. PostgreSQL, Cloudinary, and Cloudflare R2 are documented for Phase 2 and are not connected.

Every published story is sample copy. The site says so in the banner, on the story, and in the article body. Do not treat the copy as a report of a real event.

## Technology

- React 19, Vite, TypeScript, Tailwind CSS, and React Router in `apps/web`
- Node.js, Express, TypeScript, Zod, and Swagger UI in `apps/api`
- Shared types and Zod schemas in `packages/shared`
- Vitest and Supertest for the API
- PDF pages drawn with `@napi-rs/canvas` (so Hindi shaping works) and embedded with `pdf-lib`
- bcrypt password hashes and an HTTP-only session cookie

The API is JSON under `/api/v1`. There is one Node process, no Redis, and no database client.

## Folders

| Path | What it holds |
| --- | --- |
| `apps/web` | Public site and newsroom UI |
| `apps/web/src/features` | Home, article, listings, search, live, about, contact, login, and admin pages |
| `apps/web/src/lib/i18n.ts` | English and Hindi interface dictionaries |
| `apps/api/src/modules` | HTTP routes |
| `apps/api/src/services` | Validation-backed business rules |
| `apps/api/src/repositories` | Storage interface and the JSON implementation |
| `apps/api/data/seed-data.json` | Generated seed. Do not hand-edit; run `npm run generate-seed` |
| `apps/api/data/demo-data.json` | Writable state. Created on first API start. Git-ignored |
| `apps/api/uploads` | Local uploaded PDFs and images. Not publicly static |
| `apps/api/assets/fonts` | Noto Sans Devanagari, used for PDFs, under the SIL Open Font License |
| `packages/shared` | Types, Zod schemas, roles, statuses, and the trending rule |
| `database` | Phase 2 PostgreSQL `schema.sql`, `seed.sql`, and setup notes |
| `docs` | Architecture, API, roles, data model, tests, and the Phase 2 map |
| `scripts` | Seed generation, demo reset, and demo validation |

## How a request moves

The browser calls `/api/v1`. Vite proxies that prefix to port 4000 so the session cookie stays on the same site. Express validates the query or body, loads the session, and checks the role. The service mutates a cloned document through `DataRepository.update`. The JSON repository validates the document and writes it. The response is `{ success, data, meta? }` or `{ success: false, error }`.

Public routes never return an article whose status is not `published`.

## JSON repository

`apps/api/src/repositories/json-repository.ts` is a single-process store. Writes are queued in memory so two requests in the same process cannot interleave a save. The queue is not a lock across multiple servers. Do not run more than one API process against the same demo file.

On startup, if `demo-data.json` is missing, the API copies `seed-data.json` into it. If the file already exists, startup does not overwrite it. If the file is not valid JSON or fails the shared schema, startup throws and names `npm run reset-demo`. It does not switch to another provider.

`DATA_PROVIDER` must be `json`. Any other value aborts startup.

## Reset the demo

Stop the API, then from the repository root:

```bash
npm run reset-demo
```

That replaces `apps/api/data/demo-data.json` with the seed. A running API still holds the old document in memory and will write it back on the next change. While the API is running, an admin session can reset both memory and disk with `POST /api/v1/admin/demo/reset`. That route is refused when `NODE_ENV` is `production`.

Check a data file without writing it:

```bash
npm run validate-demo
```

## Environment

Copy the examples. They contain no production secrets.

```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```

Frontend: `VITE_API_BASE_URL` defaults to `/api/v1`. Do not put the session secret in a `VITE_` variable.

Backend:

| Variable | Development meaning |
| --- | --- |
| `PORT` | API port, default 4000 |
| `NODE_ENV` | `development` |
| `WEB_ORIGIN` | Browser origin allowed by CORS, default `http://localhost:5173` |
| `SESSION_SECRET` | Cookie signing secret. Required, and not the development fallback, when `NODE_ENV` is `production` |
| `DATA_PROVIDER` | Must stay `json` in Phase 1 |
| `DEMO_DATA_FILE` | Writable JSON path, default `data/demo-data.json` inside `apps/api` |
| `DEMO_UPLOAD_DIR` | Upload directory, default `uploads` |

If `apps/api/.env` is absent, development uses port 4000, the local web origin, the JSON provider, and a development-only session secret. Production refuses to start with that fallback.

## Install and run

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

- Site: http://localhost:5173
- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs

`npm run dev` builds the shared package, then starts the API and the web app together. The first API start creates `apps/api/data/demo-data.json` from the seed.

Other root scripts:

```bash
npm test
npm run build
npm run generate-seed
npm run reset-demo
npm run validate-demo
npm start
```

`npm start` builds the shared package and starts the compiled API. It does not start Vite.

## Demo credentials

These accounts exist only for the demonstration. The passwords below are the seed passwords. Stored values are bcrypt hashes.

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@newsindia.example | Admin@12345 |
| Editor | editor@newsindia.example | Editor@12345 |
| Reporter | reporter@newsindia.example | Reporter@12345 |

Sign in at http://localhost:5173/admin/login. The newsroom calls the same API as the public site. A reporter cannot publish. An editor cannot administer users. The API rejects those calls even if the button is forced.

## API

The route list, query parameters, and status codes are in [docs/api.md](docs/api.md). Swagger UI is at http://localhost:4000/api/docs while the API is running.

Article lists support `page`, `limit`, `language`, `category`, `coverage`, `state`, `city`, `tag`, `sort`, and `featured`. Trending is calculated from view count, a trending boost, a breaking bonus, and recency. The formula is the `TRENDING_RULE` constant in `packages/shared`.

## Tests

```bash
npm test
```

The suite uses a temporary JSON file. It covers health, listing, search, both languages, sessions, authorization, the editorial workflow, persistence across a new repository instance, PDF output, upload checks, YouTube validation, and a corrupt data file. Details are in [docs/testing.md](docs/testing.md).

## PostgreSQL later

Phase 1 does not need PostgreSQL. When you are ready for Phase 2, create an empty database and run the scripts:

```bash
createdb news_india
psql -d news_india -f database/schema.sql
psql -d news_india -f database/seed.sql
```

Verification queries are in [database/README.md](database/README.md). The SQL seed includes bcrypt hashes, not plaintext passwords.

## Phase 2

[docs/phase-2-migration.md](docs/phase-2-migration.md) names the repository files, the services that depend on the interface, and how a PostgreSQL class would implement that interface. The frontend should keep calling `/api/v1` so the same pages can run against either provider.

Cloudinary replaces remote image URLs inside the media service. Article components already render whatever cover URL the API returns. Cloudflare R2 replaces `LocalFileStorage` with a class that has the same `save`, `read`, and `remove` methods. Uploaded PDFs stay behind authenticated download routes.

## Images, fonts, and PDFs

Cover images in the seed are direct `images.unsplash.com` URLs stored on the article records. They are loaded lazily. If a URL fails, the card shows a placeholder. These URLs were chosen as public Unsplash image addresses and are not a license grant for commercial publishing. Replace them, or confirm their license, before production.

PDFs use the bundled Noto Sans Devanagari font in `apps/api/assets/fonts`. The font is under the SIL Open Font License; see `OFL.txt` in that folder. Hindi is drawn by the canvas library and embedded as page images so the conjuncts shape correctly. The public site also has a print stylesheet and a print button.

The live desk starts with no video id. An admin or editor can save a YouTube URL. Until then the page shows an empty state and does not pretend a video is live.

## Limitations

- One API process. The JSON file will corrupt or lose updates if two processes write it.
- Sessions live in process memory and end when the API restarts. Sign in again after a restart.
- Demo authentication, demo passwords, and the development session secret are not production settings.
- `DATA_PROVIDER=postgres` is rejected on purpose.
- Unsplash URLs can change or disappear. The placeholder covers a failed image.
- Clearing a Hindi title in the editor and saving does not delete an existing Hindi translation. Leave the Hindi title in place, or edit it.
- `npm audit` may still report vulnerabilities in transitive packages. Review them before a public deployment.
- The SQL scripts are not executed by `npm run dev`.
