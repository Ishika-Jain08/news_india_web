import { mkdir } from 'node:fs/promises'
import { createApp } from './app.js'
import { loadEnv } from './config/env.js'
import { createRepository } from './repositories/index.js'

const env = loadEnv()
if (env.nodeEnv === 'development' && env.sessionSecret === 'dev-only-news-india-session-secret') {
  console.warn('SESSION_SECRET is using the development-only default. Set a unique secret before any shared deployment.')
}
if (env.nodeEnv === 'production') {
  console.warn('Phase 1 sessions are stored in memory and demo passwords are public. Replace authentication before production use.')
}

const repo = createRepository(env)
await repo.init()
await mkdir(env.uploadDir, { recursive: true })

const app = createApp(env, repo)
app.listen(env.port, () => {
  console.log(`News India API listening on http://localhost:${env.port}`)
  console.log(`OpenAPI docs: http://localhost:${env.port}/api/docs`)
  console.log(`JSON data file: ${env.demoDataFile}`)
})
