import type { Response } from 'express'
import type { PageMeta } from '@news-india/shared'

export function sendData<T>(res: Response, data: T, meta?: PageMeta, status = 200) {
  res.status(status).json(meta ? { success: true, data, meta } : { success: true, data })
}

export function sendCreated<T>(res: Response, data: T) {
  sendData(res, data, undefined, 201)
}
