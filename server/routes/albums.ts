import { Router } from 'express'
import { db } from '../db.js'
import { albums, photoAlbumLinks } from '../schema.js'
import { eq, inArray } from 'drizzle-orm'

const router = Router()

// GET /api/albums — all albums with photo IDs
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(albums).orderBy(albums.createdAt)
    const ids = rows.map(a => a.id)

    const links = ids.length
      ? await db.select().from(photoAlbumLinks).where(inArray(photoAlbumLinks.albumId, ids))
      : []

    const photosByAlbum = links.reduce<Record<string, string[]>>((acc, l) => {
      ;(acc[l.albumId] ??= []).push(l.photoId)
      return acc
    }, {})

    res.json(rows.map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
      photoIds: photosByAlbum[a.id] ?? [],
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch albums' })
  }
})

// POST /api/albums
router.post('/', async (req, res) => {
  try {
    const body = req.body
    const [album] = await db.insert(albums).values({
      name: body.name,
      description: body.description ?? '',
      type: body.type ?? 'custom',
      icon: body.icon ?? '📸',
      color: body.color ?? '#f43f5e',
    }).returning()
    res.status(201).json({ ...album, createdAt: album.createdAt.toISOString(), photoIds: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create album' })
  }
})

// PATCH /api/albums/:id
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body
    const allowed: Record<string, unknown> = {}
    if (body.name         !== undefined) allowed.name         = body.name
    if (body.description  !== undefined) allowed.description  = body.description
    if (body.coverPhotoId !== undefined) allowed.coverPhotoId = body.coverPhotoId
    if (body.isHidden     !== undefined) allowed.isHidden     = body.isHidden
    if (body.isLocked     !== undefined) allowed.isLocked     = body.isLocked
    if (body.icon         !== undefined) allowed.icon         = body.icon
    if (body.color        !== undefined) allowed.color        = body.color

    await db.update(albums).set(allowed).where(eq(albums.id, id))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update album' })
  }
})

// DELETE /api/albums/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.delete(albums).where(eq(albums.id, req.params.id))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete album' })
  }
})

// POST /api/albums/:id/photos — add photo to album
router.post('/:id/photos', async (req, res) => {
  try {
    const { photoId } = req.body
    await db.insert(photoAlbumLinks)
      .values({ albumId: req.params.id, photoId })
      .onConflictDoNothing()
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add photo to album' })
  }
})

// DELETE /api/albums/:id/photos/:photoId — remove photo from album
router.delete('/:id/photos/:photoId', async (req, res) => {
  try {
    await db.delete(photoAlbumLinks).where(
      eq(photoAlbumLinks.albumId, req.params.id)
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to remove photo from album' })
  }
})

export default router
