import { Router } from 'express'
import { neon } from '@neondatabase/serverless'

const router = Router()
const sql = neon(process.env.DATABASE_URL!)

// GET /api/signals?user=X  — active signal for this user (any role)
// GET /api/signals?id=UUID — specific signal by id
router.get('/', async (req, res) => {
  try {
    const { user, id } = req.query as { user?: string; id?: string }

    if (id) {
      const rows = await sql`SELECT * FROM call_signals WHERE id = ${id} LIMIT 1`
      return res.json(rows[0] ?? null)
    }

    if (!user) return res.status(400).json({ error: 'user or id required' })

    const rows = await sql`
      SELECT * FROM call_signals
      WHERE (from_user = ${user} OR to_user = ${user})
        AND status NOT IN ('ended','missed','declined')
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

    // Close any existing active calls first
    await sql`
      UPDATE call_signals SET status = 'ended', updated_at = NOW()
      WHERE (from_user = ${fromUser} OR to_user = ${fromUser})
        AND status NOT IN ('ended','missed','declined')
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

// PATCH /api/signals/:id — update status and/or SDP fields
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { status, sdpOffer, sdpAnswer } = req.body

    const [row] = await sql`
      UPDATE call_signals SET
        status     = COALESCE(${status     ?? null}, status),
        sdp_offer  = COALESCE(${sdpOffer  ?? null}, sdp_offer),
        sdp_answer = COALESCE(${sdpAnswer ?? null}, sdp_answer),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `
    res.json(row ?? null)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to update signal' })
  }
})

export default router
