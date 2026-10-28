declare module 'multer' {
  import type { RequestHandler } from 'express'

  interface StorageEngine {
    _handleFile(req: unknown, file: unknown, callback: (error?: unknown, info?: unknown) => void): void
    _removeFile(req: unknown, file: unknown, callback: (error: Error | null) => void): void
  }

  interface Options {
    storage?: StorageEngine
    limits?: { fileSize?: number }
  }

  interface Instance {
    single(fieldName: string): RequestHandler
  }

  interface Multer {
    (options?: Options): Instance
    memoryStorage(): StorageEngine
  }

  const multer: Multer
  export default multer
}
