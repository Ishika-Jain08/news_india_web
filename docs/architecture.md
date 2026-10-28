# Architecture

News India Phase 1 is a single npm-workspace monorepo. The browser talks only to the REST API. The API validates input, checks the session, applies editorial rules, and then reads or writes a JSON file. The React app does not open that file and does not know whether a future build will store rows in PostgreSQL.

```text
Browser
  -> Vite (apps/web) proxies /api to the API
  -> Express /api/v1
  -> Zod validation
  -> session cookie + CSRF + role checks
  -> service
  -> DataRepository
  -> apps/api/data/demo-data.json
```

## Applications

`apps/web` is a Vite React application. Public pages live under `src/features`. Shared chrome lives under `src/components`. `src/services/api.ts` sends cookies and the CSRF header. `src/lib/i18n.ts` holds the English and Hindi interface copy. Routes are `/:lang/...` for readers and `/admin/...` for the newsroom.

`apps/api` is an Express application. `src/app.ts` builds the HTTP app. `src/server.ts` loads configuration, initializes the repository, and listens. Route modules stay thin. Business rules live in `src/services`. Storage lives behind `src/repositories/repository.ts`.

`packages/shared` is the contract both sides compile against: domain types, Zod schemas, role names, status names, and the trending formula string.

## Request path

1. A page calls `api('/articles?...')`.
2. The matching route parses the query or body with a shared Zod schema.
3. Public reads stop there and call a service method.
4. Newsroom routes require a session. Mutating requests also require `X-CSRF-Token`.
5. The service checks the role and the article status, then calls `repository.update`.
6. The JSON repository clones the in-memory document, runs the mutator, validates the whole document, and writes it with a temporary file plus rename.
7. The route returns `{ success, data, meta? }` or `{ success: false, error }`.

## What is deliberately not in Phase 1

There is no PostgreSQL client, no Redis, no message bus, and no object-storage SDK. `DATA_PROVIDER` must be `json`. Any other value stops startup. A corrupt demo file also stops startup and tells the operator to run `npm run reset-demo`. The process does not silently load a different store.
