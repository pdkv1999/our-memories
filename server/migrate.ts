/**
 * Run this once to create all tables in your Neon database:
 *   npm run db:migrate
 *
 * Or use `npm run db:push` to auto-push schema without migration files.
 */
import { config } from 'dotenv'
config()

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function migrate() {
  console.log('🗄️  Running migrations against Neon…\n')

  await sql`
    CREATE TABLE IF NOT EXISTS photos (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      filename     VARCHAR(255) NOT NULL,
      full_data    TEXT NOT NULL,
      thumb_data   TEXT NOT NULL,
      width        INTEGER NOT NULL,
      height       INTEGER NOT NULL,
      aspect_ratio DOUBLE PRECISION NOT NULL,
      size         INTEGER NOT NULL,
      mime_type    VARCHAR(50) NOT NULL,
      uploaded_by  VARCHAR(50) NOT NULL,
      uploaded_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      caption      TEXT DEFAULT '' NOT NULL,
      location     VARCHAR(255) DEFAULT '' NOT NULL,
      tags         TEXT[] DEFAULT '{}' NOT NULL,
      likes        INTEGER DEFAULT 0 NOT NULL,
      liked        BOOLEAN DEFAULT FALSE NOT NULL
    );
  `
  console.log('✅  photos')

  await sql`
    CREATE TABLE IF NOT EXISTS photo_comments (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      photo_id   UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      text       TEXT NOT NULL,
      author     VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `
  console.log('✅  photo_comments')

  await sql`
    CREATE TABLE IF NOT EXISTS albums (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name           VARCHAR(255) NOT NULL,
      description    TEXT DEFAULT '' NOT NULL,
      type           VARCHAR(20) DEFAULT 'custom' NOT NULL,
      cover_photo_id UUID,
      created_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      is_hidden      BOOLEAN DEFAULT FALSE NOT NULL,
      is_locked      BOOLEAN DEFAULT FALSE NOT NULL,
      passcode       VARCHAR(100) DEFAULT '' NOT NULL,
      icon           VARCHAR(20) DEFAULT '📸' NOT NULL,
      color          VARCHAR(20) DEFAULT '#f43f5e' NOT NULL
    );
  `
  console.log('✅  albums')

  await sql`
    CREATE TABLE IF NOT EXISTS photo_album_links (
      photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
      album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      PRIMARY KEY (photo_id, album_id)
    );
  `
  console.log('✅  photo_album_links')

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender         VARCHAR(50) NOT NULL,
      content        TEXT NOT NULL,
      type           VARCHAR(20) DEFAULT 'text' NOT NULL,
      photo_id       UUID,
      photo_thumb    TEXT,
      audio_duration INTEGER,
      timestamp      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      is_read        BOOLEAN DEFAULT FALSE NOT NULL,
      reply_to_id    UUID,
      reactions      JSONB DEFAULT '[]' NOT NULL
    );
  `
  console.log('✅  messages')

  await sql`
    CREATE TABLE IF NOT EXISTS call_records (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      initiator  VARCHAR(50) NOT NULL,
      type       VARCHAR(10) NOT NULL,
      status     VARCHAR(20) NOT NULL,
      started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      duration   INTEGER DEFAULT 0 NOT NULL
    );
  `
  console.log('✅  call_records')

  // Useful indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_photos_uploaded_at ON photos(uploaded_at DESC);`
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp ASC);`
  await sql`CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON photo_comments(photo_id);`
  await sql`CREATE INDEX IF NOT EXISTS idx_album_links_album ON photo_album_links(album_id);`

  console.log('\n✅  All tables ready!')
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
