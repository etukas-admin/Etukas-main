import type { Response } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

export function sendOk<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>) {
  return res.status(status).json({ ok: true, data, meta });
}

export function sendCreated<T>(res: Response, data: T) {
  return sendOk(res, data, 201);
}
