import { Router } from 'express'
import { db } from '../db.js'
import { photos, photoComments, photoAlbumLinks } from '../schema.js'
import { eq, desc, inArray } from 'drizzle-orm'

const router = Router()

// GET /api/photos — all photos with comments and album IDs
router.get('/', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(photos)
      .orderBy(desc(photos.uploadedAt))

    const ids = rows.map(p => p.id)
    const [comments, links] = await Promise.all([
      ids.length ? db.select().from(photoComments).where(inArray(photoComments.photoId, ids)) : [],
      ids.length ? db.select().from(photoAlbumLinks).where(inArray(photoAlbumLinks.photoId, ids)) : [],
    ])

    const commentsByPhoto = comments.reduce<Record<string, typeof comments>>((acc, c) => {
      ;(acc[c.photoId] ??= []).push(c)
      return acc
    }, {})

    const albumsByPhoto = links.reduce<Record<string, string[]>>((acc, l) => {
      ;(acc[l.photoId] ??= []).push(l.albumId)
      return acc
    }, {})

    const result = rows.map(p => ({
      ...p,
      uploadedAt: p.uploadedAt.toISOString(),
      comments: (commentsByPhoto[p.id] ?? []).map(c => ({
        ...c, createdAt: c.createdAt.toISOString(),
      })),
      albumIds: albumsByPhoto[p.id] ?? [],
    }))

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch photos' })
  }
})

// POST /api/photos — create photo
router.post('/', async (req, res) => {
  try {
    const body = req.body
    const [photo] = await db.insert(photos).values({
      filename:    body.filename,
      fullData:    body.fullData,
      thumbData:   body.thumbData,
      width:       body.width,
      height:      body.height,
      aspectRatio: body.aspectRatio,
      size:        body.size,
      mimeType:    body.mimeType,
      uploadedBy:  body.uploadedBy,
      caption:     body.caption ?? '',
      location:    body.location ?? '',
      tags:        body.tags ?? [],
    }).returning()

    res.status(201).json({ ...photo, uploadedAt: photo.uploadedAt.toISOString(), comments: [], albumIds: [] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create photo' })
  }
})

// PATCH /api/photos/:id — update caption / location / tags / etc
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const body = req.body
    const allowed: Record<string, unknown> = {}
    if (body.caption   !== undefined) allowed.caption   = body.caption
    if (body.location  !== undefined) allowed.location  = body.location
    if (body.tags      !== undefined) allowed.tags      = body.tags
    if (body.liked     !== undefined) allowed.liked     = body.liked
    if (body.likes     !== undefined) allowed.likes     = body.likes

    await db.update(photos).set(allowed).where(eq(photos.id, id))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update photo' })
  }
})

// POST /api/photos/:id/like — toggle like
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params
    const [photo] = await db.select({ liked: photos.liked, likes: photos.likes }).from(photos).where(eq(photos.id, id))
    if (!photo) return res.status(404).json({ error: 'Not found' })

    const newLiked = !photo.liked
    const newLikes = newLiked ? photo.likes + 1 : photo.likes - 1
    await db.update(photos).set({ liked: newLiked, likes: newLikes }).where(eq(photos.id, id))
    res.json({ liked: newLiked, likes: newLikes })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to toggle like' })
  }
})

// DELETE /api/photos — bulk delete
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body as { ids: string[] }
    if (!ids?.length) return res.status(400).json({ error: 'ids required' })
    await db.delete(photos).where(inArray(photos.id, ids))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete photos' })
  }
})

// POST /api/photos/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params
    const { text, author } = req.body
    const [comment] = await db.insert(photoComments).values({ photoId: id, text, author }).returning()
    res.status(201).json({ ...comment, createdAt: comment.createdAt.toISOString() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to add comment' })
  }
})

// DELETE /api/photos/:id/comments/:commentId
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    await db.delete(photoComments).where(eq(photoComments.id, req.params.commentId))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete comment' })
  }
})

export default router
