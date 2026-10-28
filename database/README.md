# PostgreSQL scripts

These scripts prepare the Phase 2 database. The Phase 1 application does not connect to PostgreSQL and does not read these files at startup.

`schema.sql` creates the tables, enums, keys, checks, and indexes. `seed.sql` inserts the same demonstration users, categories, articles, translations, revisions, media metadata, live-stream row, breaking rows, and audit entry that `apps/api/data/seed-data.json` contains. Passwords in `seed.sql` are bcrypt hashes.

## Create the database

Using PostgreSQL 14 or newer:

```bash
createdb news_india
psql -d news_india -f database/schema.sql
psql -d news_india -f database/seed.sql
```

On Windows, if the PostgreSQL tools are on your PATH:

```powershell
createdb news_india
psql -d news_india -f database/schema.sql
psql -d news_india -f database/seed.sql
```

Run both scripts against an empty database. `seed.sql` is wrapped in a transaction and expects the tables from `schema.sql` to exist and to be empty.

## Verify

```bash
psql -d news_india -c "\dt"
psql -d news_india -c "SELECT role, email FROM users ORDER BY role;"
psql -d news_india -c "SELECT status, count(*) FROM articles GROUP BY status ORDER BY status;"
psql -d news_india -c "SELECT language, count(*) FROM article_translations GROUP BY language;"
```

Expect three users, ten categories, and at least 30 articles. Published rows have `published_at`. Hindi and English titles live in `article_translations` and share `article_id`.

## Regenerate the seed

From the repository root:

```bash
npm run generate-seed
```

That rewrites `apps/api/data/seed-data.json` and `database/seed.sql` together. It does not rewrite `demo-data.json` and it does not touch a running PostgreSQL database. Password hashes change on each generation because bcrypt uses a new salt, so regenerate both files together and do not mix an old JSON seed with a new SQL seed.
