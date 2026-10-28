import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { demoDatabaseSchema } from '../packages/shared/src/index.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  path.join(root, 'apps', 'api', 'data', 'seed-data.json'),
  process.env.DEMO_DATA_FILE
    ? path.isAbsolute(process.env.DEMO_DATA_FILE)
      ? process.env.DEMO_DATA_FILE
      : path.resolve(root, 'apps', 'api', process.env.DEMO_DATA_FILE)
    : path.join(root, 'apps', 'api', 'data', 'demo-data.json'),
]

async function main() {
  let failed = false
  for (const file of files) {
    try {
      await access(file)
    } catch {
      if (file.endsWith('demo-data.json')) {
        console.log(`${file} does not exist yet. The API creates it from the seed on first startup.`)
        continue
      }
      console.error(`Missing ${file}`)
      failed = true
      continue
    }
    try {
      const parsed = demoDatabaseSchema.parse(JSON.parse(await readFile(file, 'utf8')))
      const statuses = parsed.articles.reduce<Record<string, number>>((counts, article) => {
        counts[article.status] = (counts[article.status] ?? 0) + 1
        return counts
      }, {})
      console.log(`${file}: ${parsed.articles.length} articles, ${parsed.users.length} users, ${parsed.categories.length} categories`)
      console.log(`  statuses: ${JSON.stringify(statuses)}`)
    } catch (error) {
      failed = true
      console.error(`${file} failed validation.`)
      console.error(error instanceof Error ? error.message : error)
    }
  }
  if (failed) process.exit(1)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
