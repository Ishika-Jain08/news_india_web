# API

Base path: `/api/v1`. Interactive documentation: `http://localhost:4000/api/docs`. The OpenAPI document is also at `http://localhost:4000/api/docs.json`.

Successful JSON:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 } }
```

`meta` is present on paginated lists. Errors:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Invalid request" } }
```

Status codes: 200 read or update, 201 create, 204 delete, 400 validation, 401 no session, 403 forbidden or CSRF failure, 404 missing, 409 conflict, 500 unexpected.

## Public

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` and `/api/v1/health` | Process health, phase, provider, article count |
| GET | `/api/v1/home` | Homepage sections |
| GET | `/api/v1/articles` | Published stories |
| GET | `/api/v1/articles/:slug` | One published story; increments the view count |
| GET | `/api/v1/articles/:slug/pdf` | PDF of a published story |
| GET | `/api/v1/articles/:id/related` | Related published stories |
| GET | `/api/v1/news/breaking` | Published stories flagged breaking, ordered by priority |
| GET | `/api/v1/news/trending` | Published stories ranked by the trending rule |
| GET | `/api/v1/news/featured` | Featured published stories |
| GET | `/api/v1/news/top` | Published stories ordered by view count |
| GET | `/api/v1/news/places` | State and city counts for published stories |
| GET | `/api/v1/categories` | Sections |
| GET | `/api/v1/categories/:slug/articles` | Published stories in a section |
| GET | `/api/v1/search?q=` | Published stories matching title, summary, body, or tags |
| GET | `/api/v1/live` and `/api/v1/live/current` | Public live desk |
| POST | `/api/v1/contact` | Store a contact message |

Article lists accept `page`, `limit` (maximum 50), `language` (`en` or `hi`), `category`, `coverage`, `state`, `city`, `tag`, `sort` (`latest`, `oldest`, `views`, `title`), and `featured`. `status` is honored only on the newsroom list.

Trending score, from `TRENDING_RULE` in the shared package:

```text
score = viewCount + trendingBoost + (breaking ? 40 : 0) + max(0, 10 - fullDaysSincePublished) * 8
```

Only published stories are ranked. Ties use `publishedAt` descending, then id.

## Authentication

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/auth/csrf` | Issue the CSRF token and session cookie |
| POST | `/api/v1/auth/login` | Email and password. Exempt from CSRF. Rate-limited. |
| POST | `/api/v1/auth/logout` | Destroy the session |
| GET | `/api/v1/auth/me` | Current user |

The cookie name is `ni.sid`. It is HTTP-only, `SameSite=Lax`, and `Secure` only when `NODE_ENV=production`. Mutating requests send `X-CSRF-Token`.

## Newsroom

All `/api/v1/admin/*` routes require a session. Role limits are in `docs/roles-and-permissions.md`.

| Method | Path |
| --- | --- |
| GET | `/api/v1/admin/dashboard` |
| GET, POST | `/api/v1/admin/articles` |
| GET, PATCH, DELETE | `/api/v1/admin/articles/:id` |
| POST | `/api/v1/admin/articles/:id/submit` |
| POST | `/api/v1/admin/articles/:id/approve` |
| POST | `/api/v1/admin/articles/:id/reject` |
| POST | `/api/v1/admin/articles/:id/publish` |
| POST | `/api/v1/admin/articles/:id/unpublish` |
| GET | `/api/v1/admin/articles/:id/pdf` |
| POST | `/api/v1/admin/articles/:id/original-pdf` |
| GET, POST | `/api/v1/admin/categories` |
| PATCH, DELETE | `/api/v1/admin/categories/:id` |
| GET, POST | `/api/v1/admin/users` |
| PATCH | `/api/v1/admin/users/:id` |
| PATCH | `/api/v1/admin/users/:id/role` |
| GET, PATCH | `/api/v1/admin/live` |
| GET, POST | `/api/v1/admin/media`, `/api/v1/admin/media/upload` |
| GET | `/api/v1/admin/media/:id/file` |
| DELETE | `/api/v1/admin/media/:id` |
| GET | `/api/v1/admin/audit-logs` |
| POST | `/api/v1/admin/demo/reset` |

`POST /admin/demo/reset` is admin-only and refused when `NODE_ENV` is `production`. Uploaded files are not served from a public directory. Download routes require a session. Uploads are limited to 10 MB and must sniff as PDF, PNG, JPEG, or WebP.
