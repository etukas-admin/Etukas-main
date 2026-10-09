import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/api/v1/auth"
  } as const;
}

export function issueCsrf(res: Response) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie("etukas_csrf", token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path: "/"
  });
  return token;
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const cookieToken = req.cookies?.etukas_csrf;
  const headerToken = req.header("x-csrf-token");
  if (!cookieToken || cookieToken !== headerToken) {
    return next(new HttpError(403, "CSRF_FAILED", "CSRF token missing or invalid"));
  }
  next();
}
