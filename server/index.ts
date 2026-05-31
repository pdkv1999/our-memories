import 'dotenv/config'
import app from './app.js'

const PORT = Number(process.env.PORT ?? 3001)

app.listen(PORT, () => {
  console.log(`\n🚀  API server running at http://localhost:${PORT}`)
  console.log(`📡  Database: ${process.env.DATABASE_URL ? 'Neon connected' : '⚠️  DATABASE_URL not set'}`)
})
