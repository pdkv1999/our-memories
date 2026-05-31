import { Router } from 'express'
import { db } from '../db.js'
import { messages } from '../schema.js'
import { eq, asc, ne } from 'drizzle-orm'

const router = Router()

// GET /api/messages
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(messages).orderBy(asc(messages.timestamp))
    res.json(rows.map(m => ({ ...m, timestamp: m.timestamp.toISOString() })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// POST /api/messages
router.post('/', async (req, res) => {
  try {
    const body = req.body
    const [msg] = await db.insert(messages).values({
      sender:        body.sender,
      content:       body.content,
      type:          body.type ?? 'text',
      photoId:       body.photoId ?? null,
      photoThumb:    body.photoThumb ?? null,
      audioDuration: body.audioDuration ?? null,
      replyToId:     body.replyToId ?? null,
      reactions:     [],
    }).returning()
    res.status(201).json({ ...msg, timestamp: msg.timestamp.toISOString() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send message' })
  }
})

// DELETE /api/messages/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.delete(messages).where(eq(messages.id, req.params.id))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete message' })
  }
})

// POST /api/messages/:id/react — toggle emoji reaction
router.post('/:id/react', async (req, res) => {
  try {
    const { id } = req.params
    const { emoji, by } = req.body

    const [msg] = await db.select({ reactions: messages.reactions }).from(messages).where(eq(messages.id, id))
    if (!msg) return res.status(404).json({ error: 'Not found' })

    let reactions = (msg.reactions ?? []) as { emoji: string; by: string }[]
    const existing = reactions.findIndex(r => r.by === by && r.emoji === emoji)

    if (existing >= 0) {
      reactions = reactions.filter((_, i) => i !== existing)
    } else {
      reactions = reactions.filter(r => r.by !== by)
      reactions.push({ emoji, by })
    }

    await db.update(messages).set({ reactions }).where(eq(messages.id, id))
    res.json({ reactions })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to react' })
  }
})

// PATCH /api/messages/read — mark all messages from others as read
router.patch('/read', async (req, res) => {
  try {
    const { currentUser } = req.body
    await db.update(messages)
      .set({ isRead: true })
      .where(ne(messages.sender, currentUser))
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to mark read' })
  }
})

export default router
