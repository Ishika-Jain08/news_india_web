import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { AppError } from '../lib/errors.js'

/**
 * Phase 1 file storage. Phase 2 can replace this class with an R2 implementation
 * that keeps the same method names.
 */
export class LocalFileStorage {
  constructor(private readonly root: string) {}

  async save(filename: string, buffer: Buffer): Promise<{ storageKey: string }> {
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      throw new AppError(400, 'INVALID_FILE', 'Invalid storage filename')
    }
    await mkdir(this.root, { recursive: true })
    await writeFile(this.resolve(filename), buffer)
    return { storageKey: filename }
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolve(storageKey))
  }

  async remove(storageKey: string): Promise<void> {
    await rm(this.resolve(storageKey), { force: true })
  }

  private resolve(storageKey: string): string {
    if (!/^[a-zA-Z0-9._-]+$/.test(storageKey)) {
      throw new AppError(400, 'INVALID_FILE', 'Invalid storage key')
    }
    const root = path.resolve(this.root)
    const full = path.resolve(root, storageKey)
    if (full !== path.join(root, storageKey)) {
      throw new AppError(400, 'INVALID_FILE', 'Invalid storage key')
    }
    return full
  }
}

export function detectMime(buffer: Buffer): 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('utf8') === '%PDF-') return 'application/pdf'
  if (buffer.length >= 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png'
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('utf8') === 'RIFF' && buffer.subarray(8, 12).toString('utf8') === 'WEBP') {
    return 'image/webp'
  }
  return null
}
