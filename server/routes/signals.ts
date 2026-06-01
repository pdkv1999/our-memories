import { Router } from 'express'
import { db } from '../db.js'
import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core'
import { eq, and, or, desc } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'

const router = Router()
const sql = neon(process.env.DATABASE_URL!)

// GET /api/signals?user=Siri  — fetch active/pending signal for this user
router.get('/', async (req, res) => {
  try {
    const { user } = req.query as { user: string }
    if (!user) return res.status(400).json({ error: 'user required' })

    // Find most recent signal involving this user that isn't ended/missed/declined
    const rows = await sql`
      SELECT * FROM call_signals
      WHERE (from_user = ${user} OR to_user = ${user})
        AND status NOT IN ('ended', 'missed', 'declined')
      ORDER BY created_at DESC
      LIMIT 1
    `
    res.json(rows[0] ?? null)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch signal' })
  }
})

// POST /api/signals — start a call
router.post('/', async (req, res) => {
  try {
    const { fromUser, toUser, callType } = req.body

    // End any existing active calls first
    await sql`
      UPDATE call_signals SET status = 'ended', updated_at = NOW()
      WHERE (from_user = ${fromUser} OR to_user = ${fromUser})
        AND status NOT IN ('ended', 'missed', 'declined')
    `

    const [row] = await sql`
      INSERT INTO call_signals (from_user, to_user, call_type, status)
      VALUES (${fromUser}, ${toUser}, ${callType}, 'calling')
      RETURNING *
    `
    res.status(201).json(row)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create signal' })
  }
})

// PATCH /api/signals/:id — update status (accepted, declined, ended)
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body
    const [row] = await sql`
      UPDATE call_signals
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${req.params.id}
      RETURNING *
    `
    res.json(row ?? null)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update signal' })
  }
})

export default router
