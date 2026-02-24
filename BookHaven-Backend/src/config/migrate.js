require('dotenv').config();
const { query } = require('./database');

const createTables = async () => {
  console.log('🏗️  Running database migrations...');

  try {
    // Enable UUID extension
    await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ─── USERS TABLE ───
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        VARCHAR(255) NOT NULL,
        email       VARCHAR(255) UNIQUE NOT NULL,
        password    VARCHAR(255),
        avatar_url  TEXT,
        role        VARCHAR(20) DEFAULT 'reader' CHECK (role IN ('reader', 'admin', 'librarian')),
        provider    VARCHAR(20) DEFAULT 'local' CHECK (provider IN ('local', 'google', 'github')),
        provider_id VARCHAR(255),
        is_active   BOOLEAN DEFAULT true,
        last_login  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ─── REFRESH TOKENS TABLE ────
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ─── CATEGORIES TABLE ───
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name        VARCHAR(100) UNIQUE NOT NULL,
        slug        VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        color       VARCHAR(7) DEFAULT '#1A5276',
        icon        VARCHAR(50),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // ─── BOOKS TABLE ───
    await query(`
      CREATE TABLE IF NOT EXISTS books (
        id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title            VARCHAR(500) NOT NULL,
        author           VARCHAR(255) NOT NULL,
        description      TEXT,
        isbn             VARCHAR(20),
        publisher        VARCHAR(255),
        published_year   INTEGER,
        language         VARCHAR(50) DEFAULT 'English',
        pages            INTEGER,
        file_url         TEXT NOT NULL,
        file_type        VARCHAR(10) CHECK (file_type IN ('pdf', 'epub', 'mobi')),
        file_size        BIGINT,
        cover_url        TEXT,
        tags             TEXT[],
        avg_rating       DECIMAL(3,2) DEFAULT 0,
        total_reviews    INTEGER DEFAULT 0,
        total_downloads  INTEGER DEFAULT 0,
        total_reads      INTEGER DEFAULT 0,
        is_public        BOOLEAN DEFAULT true,
        is_featured      BOOLEAN DEFAULT false,
        uploaded_by      UUID REFERENCES users(id),
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW(),
        -- Full-text search vector — like a pre-built index at the back of a book
        search_vector    TSVECTOR
      )
    `);

    // ─── BOOK CATEGORIES (JOIN TABLE) ────
    await query(`
      CREATE TABLE IF NOT EXISTS book_categories (
        book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (book_id, category_id)
      )
    `);

    // ─── SHELVES TABLE ────
    await query(`
      CREATE TABLE IF NOT EXISTS shelves (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id    UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        status     VARCHAR(20) DEFAULT 'want_to_read'
                   CHECK (status IN ('reading', 'want_to_read', 'completed', 'dropped')),
        added_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, book_id)
      )
    `);

    // ─── READING PROGRESS TABLE ────
    await query(`
      CREATE TABLE IF NOT EXISTS reading_progress (
        id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id      UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        position     INTEGER DEFAULT 0,
        total_pages  INTEGER DEFAULT 0,
        percentage   DECIMAL(5,2) DEFAULT 0,
        last_read_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, book_id)
      )
    `);

    // ─── REVIEWS TABLE ────
    await query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        book_id    UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        body       TEXT,
        is_flagged BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (user_id, book_id)
      )
    `);

    // ─── INDEXES ────
    await query(`CREATE INDEX IF NOT EXISTS idx_books_search ON books USING gin(search_vector)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_books_year ON books(published_year)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_shelves_user ON shelves(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_progress_user ON reading_progress(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_reviews_book ON reviews(book_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`);

    // ─── TRIGGER: Auto-update search_vector on book insert/update ────
    await query(`
      CREATE OR REPLACE FUNCTION update_book_search_vector()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.author, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
          setweight(to_tsvector('english', coalesce(array_to_string(NEW.tags, ' '), '')), 'D');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await query(`DROP TRIGGER IF EXISTS books_search_vector_trigger ON books`);
    await query(`
      CREATE TRIGGER books_search_vector_trigger
      BEFORE INSERT OR UPDATE ON books
      FOR EACH ROW EXECUTE FUNCTION update_book_search_vector()
    `);

    // ─── TRIGGER: Auto-update updated_at timestamps ────
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);

    const tablesWithUpdatedAt = ['users', 'books', 'shelves', 'reading_progress', 'reviews'];
    for (const table of tablesWithUpdatedAt) {
      await query(`DROP TRIGGER IF EXISTS ${table}_updated_at ON ${table}`);
      await query(`
        CREATE TRIGGER ${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
      `);
    }

    console.log('✅ All tables and triggers created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
};

createTables();
