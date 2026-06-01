import express from 'express'
import cors from 'cors'
import photosRouter from './routes/photos.js'
import albumsRouter from './routes/albums.js'
import messagesRouter from './routes/messages.js'
import callsRouter from './routes/calls.js'
import signalsRouter from './routes/signals.js'

const app = express()

// Allow all origins — this is a private couple's app
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '50mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

app.use('/api/photos',   photosRouter)
app.use('/api/albums',   albumsRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/calls',    callsRouter)
app.use('/api/signals',  signalsRouter)

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }))

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message })
})

export default app
