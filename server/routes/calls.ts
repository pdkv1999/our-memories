import { Router } from 'express'
import { db } from '../db.js'
import { callRecords } from '../schema.js'
import { desc } from 'drizzle-orm'

const router = Router()

// GET /api/calls
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(callRecords).orderBy(desc(callRecords.startedAt))
    res.json(rows.map(r => ({ ...r, startedAt: r.startedAt.toISOString() })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch calls' })
  }
})

// POST /api/calls
router.post('/', async (req, res) => {
  try {
    const body = req.body
    const [record] = await db.insert(callRecords).values({
      initiator: body.initiator,
      type:      body.type,
      status:    body.status,
      duration:  body.duration ?? 0,
    }).returning()
    res.status(201).json({ ...record, startedAt: record.startedAt.toISOString() })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save call record' })
  }
})

export default router
