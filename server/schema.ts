import {
  pgTable, uuid, text, varchar, integer, boolean,
  doublePrecision, timestamp, json, primaryKey
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Photos ────────────────────────────────────────────────────────────────

export const photos = pgTable('photos', {
  id:          uuid('id').primaryKey().defaultRandom(),
  filename:    varchar('filename', { length: 255 }).notNull(),
  fullData:    text('full_data').notNull(),          // base64 compressed image
  thumbData:   text('thumb_data').notNull(),          // base64 thumbnail
  width:       integer('width').notNull(),
  height:      integer('height').notNull(),
  aspectRatio: doublePrecision('aspect_ratio').notNull(),
  size:        integer('size').notNull(),
  mimeType:    varchar('mime_type', { length: 50 }).notNull(),
  uploadedBy:  varchar('uploaded_by', { length: 50 }).notNull(),
  uploadedAt:  timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
  caption:     text('caption').default('').notNull(),
  location:    varchar('location', { length: 255 }).default('').notNull(),
  tags:        text('tags').array().default([]).notNull(),
  likes:       integer('likes').default(0).notNull(),
  liked:       boolean('liked').default(false).notNull(),
})

export const photosRelations = relations(photos, ({ many }) => ({
  comments: many(photoComments),
  albumLinks: many(photoAlbumLinks),
}))

// ─── Photo Comments ────────────────────────────────────────────────────────

export const photoComments = pgTable('photo_comments', {
  id:        uuid('id').primaryKey().defaultRandom(),
  photoId:   uuid('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  text:      text('text').notNull(),
  author:    varchar('author', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const photoCommentsRelations = relations(photoComments, ({ one }) => ({
  photo: one(photos, { fields: [photoComments.photoId], references: [photos.id] }),
}))

// ─── Albums ────────────────────────────────────────────────────────────────

export const albums = pgTable('albums', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         varchar('name', { length: 255 }).notNull(),
  description:  text('description').default('').notNull(),
  type:         varchar('type', { length: 20 }).default('custom').notNull(),
  coverPhotoId: uuid('cover_photo_id'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  isHidden:     boolean('is_hidden').default(false).notNull(),
  isLocked:     boolean('is_locked').default(false).notNull(),
  passcode:     varchar('passcode', { length: 100 }).default('').notNull(),
  icon:         varchar('icon', { length: 20 }).default('📸').notNull(),
  color:        varchar('color', { length: 20 }).default('#f43f5e').notNull(),
})

export const albumsRelations = relations(albums, ({ many }) => ({
  photoLinks: many(photoAlbumLinks),
}))

// ─── Photo ↔ Album Junction ────────────────────────────────────────────────

export const photoAlbumLinks = pgTable('photo_album_links', {
  photoId: uuid('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
  albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
}, t => ({
  pk: primaryKey({ columns: [t.photoId, t.albumId] }),
}))

export const photoAlbumLinksRelations = relations(photoAlbumLinks, ({ one }) => ({
  photo: one(photos, { fields: [photoAlbumLinks.photoId], references: [photos.id] }),
  album: one(albums, { fields: [photoAlbumLinks.albumId], references: [albums.id] }),
}))

// ─── Messages ──────────────────────────────────────────────────────────────

export const messages = pgTable('messages', {
  id:            uuid('id').primaryKey().defaultRandom(),
  sender:        varchar('sender', { length: 50 }).notNull(),
  content:       text('content').notNull(),
  type:          varchar('type', { length: 20 }).default('text').notNull(),
  photoId:       uuid('photo_id'),
  photoThumb:    text('photo_thumb'),
  audioDuration: integer('audio_duration'),
  timestamp:     timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  isRead:        boolean('is_read').default(false).notNull(),
  replyToId:     uuid('reply_to_id'),
  reactions:     json('reactions').$type<{ emoji: string; by: string }[]>().default([]).notNull(),
})

// ─── Call Records ──────────────────────────────────────────────────────────

export const callRecords = pgTable('call_records', {
  id:        uuid('id').primaryKey().defaultRandom(),
  initiator: varchar('initiator', { length: 50 }).notNull(),
  type:      varchar('type', { length: 10 }).notNull(),    // 'video' | 'voice'
  status:    varchar('status', { length: 20 }).notNull(),  // 'completed' | 'missed' | 'declined'
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  duration:  integer('duration').default(0).notNull(),     // seconds
})

// ─── Type exports ──────────────────────────────────────────────────────────

export type Photo        = typeof photos.$inferSelect
export type NewPhoto     = typeof photos.$inferInsert
export type Album        = typeof albums.$inferSelect
export type NewAlbum     = typeof albums.$inferInsert
export type PhotoComment = typeof photoComments.$inferSelect
export type Message      = typeof messages.$inferSelect
export type NewMessage   = typeof messages.$inferInsert
export type CallRecord   = typeof callRecords.$inferSelect
