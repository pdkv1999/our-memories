import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import photosRouter from './routes/photos.js'
import albumsRouter from './routes/albums.js'
import messagesRouter from './routes/messages.js'
import callsRouter from './routes/calls.js'

const app = express()
const PORT = Number(process.env.PORT ?? 3001)

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }))
app.use(express.json({ limit: '50mb' }))  // large limit for base64 photo uploads

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// Routes
app.use('/api/photos',   photosRouter)
app.use('/api/albums',   albumsRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/calls',    callsRouter)

// 404 fallthrough
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  console.log(`\n🚀  API server running at http://localhost:${PORT}`)
  console.log(`📡  Database: ${process.env.DATABASE_URL ? 'Neon connected' : '⚠️  DATABASE_URL not set'}`)
})
