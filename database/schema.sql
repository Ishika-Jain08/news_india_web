-- News India Phase 2 schema.
-- PostgreSQL 14 or newer. Phase 1 does not connect to this database.
-- Apply to an empty database. Then run seed.sql.

BEGIN;

CREATE TYPE user_role AS ENUM ('admin', 'editor', 'reporter');
CREATE TYPE article_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'published');
CREATE TYPE coverage_level AS ENUM ('local', 'state', 'national');
CREATE TYPE content_language AS ENUM ('en', 'hi');
CREATE TYPE media_kind AS ENUM ('image', 'pdf');
CREATE TYPE media_source AS ENUM ('remote', 'local');

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  name_hi text NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_email_lowercase CHECK (email = lower(email)),
  CONSTRAINT users_password_hash_present CHECK (char_length(password_hash) >= 20)
);

CREATE TABLE categories (
  id uuid PRIMARY KEY,
  slug text NOT NULL,
  name_en text NOT NULL,
  name_hi text NOT NULL,
  description_en text NOT NULL,
  description_hi text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT categories_slug_unique UNIQUE (slug),
  CONSTRAINT categories_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE articles (
  id uuid PRIMARY KEY,
  status article_status NOT NULL,
  coverage coverage_level NOT NULL,
  state text,
  city text,
  city_hi text,
  locality text,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  tags text[] NOT NULL DEFAULT '{}',
  author_id uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  cover_image_url text,
  cover_image_alt_en text,
  cover_image_alt_hi text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  featured boolean NOT NULL DEFAULT false,
  breaking boolean NOT NULL DEFAULT false,
  trending_boost integer NOT NULL DEFAULT 0,
  source_name text,
  source_url text,
  correction_note_en text,
  correction_note_hi text,
  corrected_at timestamptz,
  rejection_reason text,
  original_pdf_id uuid,
  view_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT articles_view_count_nonnegative CHECK (view_count >= 0),
  CONSTRAINT articles_trending_boost_range CHECK (trending_boost BETWEEN 0 AND 500),
  CONSTRAINT articles_published_timestamp CHECK (status <> 'published' OR published_at IS NOT NULL),
  CONSTRAINT articles_place_rules CHECK (
    (coverage = 'national')
    OR (coverage = 'state' AND state IS NOT NULL)
    OR (coverage = 'local' AND state IS NOT NULL AND city IS NOT NULL)
  ),
  CONSTRAINT articles_tags_limit CHECK (cardinality(tags) <= 12)
);

CREATE TABLE article_translations (
  article_id uuid NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  language content_language NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  body text NOT NULL,
  slug text NOT NULL,
  seo_title text,
  seo_description text,
  PRIMARY KEY (article_id, language),
  CONSTRAINT article_translations_slug_unique UNIQUE (slug)
);

CREATE TABLE article_categories (
  article_id uuid NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  PRIMARY KEY (article_id, category_id)
);

CREATE TABLE media_assets (
  id uuid PRIMARY KEY,
  kind media_kind NOT NULL,
  source media_source NOT NULL,
  filename text NOT NULL,
  original_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  url text,
  storage_key text,
  uploaded_by uuid REFERENCES users (id) ON DELETE SET NULL,
  article_id uuid REFERENCES articles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL,
  CONSTRAINT media_assets_size_nonnegative CHECK (size_bytes >= 0),
  CONSTRAINT media_assets_location CHECK (
    (source = 'remote' AND url IS NOT NULL)
    OR (source = 'local' AND storage_key IS NOT NULL)
  )
);

ALTER TABLE articles
  ADD CONSTRAINT articles_original_pdf_fk
  FOREIGN KEY (original_pdf_id) REFERENCES media_assets (id) ON DELETE SET NULL;

CREATE TABLE article_revisions (
  id uuid PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  editor_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE live_streams (
  id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  youtube_url text,
  youtube_id text,
  title_en text NOT NULL,
  title_hi text NOT NULL,
  description_en text NOT NULL,
  description_hi text NOT NULL,
  is_current boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL,
  updated_by uuid REFERENCES users (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX live_streams_one_current ON live_streams (is_current) WHERE is_current;

CREATE TABLE breaking_news (
  id uuid PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL,
  CONSTRAINT breaking_news_article_unique UNIQUE (article_id)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY,
  actor_id uuid REFERENCES users (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL
);

CREATE TABLE contact_messages (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  language content_language NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX articles_status_idx ON articles (status);
CREATE INDEX articles_coverage_idx ON articles (coverage, state, city);
CREATE INDEX articles_published_idx ON articles (published_at DESC);
CREATE INDEX articles_author_idx ON articles (author_id);
CREATE INDEX articles_category_idx ON articles (category_id);
CREATE INDEX articles_breaking_idx ON articles (breaking) WHERE breaking;
CREATE INDEX article_translations_language_idx ON article_translations (language);
CREATE INDEX article_revisions_article_idx ON article_revisions (article_id, created_at DESC);
CREATE INDEX media_assets_article_idx ON media_assets (article_id);
CREATE INDEX breaking_news_priority_idx ON breaking_news (active, priority DESC);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX contact_messages_created_idx ON contact_messages (created_at DESC);

COMMIT;
