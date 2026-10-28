import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function apiRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
}

export function resolveFromApiRoot(value: string): string {
  return path.isAbsolute(value) ? value : path.join(apiRoot(), value)
}
