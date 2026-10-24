import { createRequire } from "node:module";
import crypto from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

type LoginRateLimitOptions = {
  windowMs: number;
  limit: number;
  standardHeaders: true;
  legacyHeaders: false;
};

const rateLimit = createRequire(import.meta.url)("express-rate-limit") as (
  options: LoginRateLimitOptions
) => RequestHandler;

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

export function cookieOptions(maxAgeMs = 30 * 24 * 60 * 60 * 1000, path = "/") {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN || undefined,
    path,
    maxAge: maxAgeMs
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
