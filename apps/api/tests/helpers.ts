import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { DEMO_ACCOUNTS } from '@news-india/shared'
import { createApp } from '../src/app.js'
import { loadEnv } from '../src/config/env.js'
import { createRepository } from '../src/repositories/index.js'

export const accounts = {
  admin: DEMO_ACCOUNTS[0],
  editor: DEMO_ACCOUNTS[1],
  reporter: DEMO_ACCOUNTS[2],
}

export async function makeApp() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'news-india-'))
  const env = loadEnv({
    nodeEnv: 'test',
    demoDataFile: path.join(dir, 'demo.json'),
    uploadDir: path.join(dir, 'uploads'),
    sessionSecret: 'test-session-secret-value',
    loginMaxAttempts: 100,
  })
  const repo = createRepository(env)
  await repo.init()
  const app = createApp(env, repo)
  return {
    app,
    repo,
    env,
    async close() {
      await rm(dir, { recursive: true, force: true })
    },
  }
}

export async function login(app: ReturnType<typeof createApp>, email: string, password: string) {
  const agent = request.agent(app)
  const response = await agent.post('/api/v1/auth/login').send({ email, password })
  return { agent, response, csrf: response.body?.data?.csrfToken as string | undefined }
}
