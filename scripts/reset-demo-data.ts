import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { demoDatabaseSchema } from '../packages/shared/src/index.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const seedFile = path.join(root, 'apps', 'api', 'data', 'seed-data.json')

function resolveDemoFile() {
  const configured = process.env.DEMO_DATA_FILE
  if (!configured) return path.join(root, 'apps', 'api', 'data', 'demo-data.json')
  return path.isAbsolute(configured) ? configured : path.resolve(root, 'apps', 'api', configured)
}

async function main() {
  const demoFile = resolveDemoFile()
  const parsed = demoDatabaseSchema.parse(JSON.parse(await readFile(seedFile, 'utf8')))
  const tmp = `${demoFile}.tmp`
  const body = `${JSON.stringify(parsed, null, 2)}\n`
  await writeFile(tmp, body, 'utf8')
  try {
    await rename(tmp, demoFile)
  } catch {
    await writeFile(demoFile, body, 'utf8')
    await unlink(tmp).catch(() => undefined)
  }
  console.log(`Reset ${demoFile} from ${seedFile}.`)
  console.log(`Articles: ${parsed.articles.length}. Users: ${parsed.users.length}.`)
  console.log('Stop the API before running this command.')
  console.log('A running API keeps the previous data in memory and will write that copy back on the next change.')
  console.log('While the API is running, an admin can reset memory and the file together with POST /api/v1/admin/demo/reset.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
