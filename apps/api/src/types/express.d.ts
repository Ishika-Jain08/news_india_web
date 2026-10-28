import type { PublicUser } from '@news-india/shared'

declare global {
  namespace Express {
    interface Request {
      currentUser?: PublicUser
      file?: { buffer: Buffer; originalname: string; mimetype: string; size: number }
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    userId?: string
    csrfToken?: string
  }
}

export {}
