import crypto from "node:crypto";
import { rateLimit } from "express-rate-limit";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

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

const CSRF_EXEMPT_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  "/auth/csrf",
  "/auth/refresh",
  "/auth/logout",
  "/seller-enquiries",
  "/seller-registration"
];

export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  // Safe HTTP methods never mutate state
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  // Normalize path to check exemptions for public auth & enquiry endpoints
  const requestPath = (req.originalUrl || req.path || "").split("?")[0].toLowerCase();
  const isExempt = CSRF_EXEMPT_PATHS.some(
    (exempt) => requestPath.endsWith(exempt) || requestPath.includes(exempt)
  );
  if (isExempt) return next();

  // Requests authenticated via explicit Authorization: Bearer token cannot be forged by CSRF
  const authHeader = req.header("authorization");
  if (authHeader && authHeader.startsWith("Bearer ") && authHeader.length > 15) {
    return next();
  }

  // Double-submit cookie verification for cookie-authenticated requests
  const cookieToken = req.cookies?.etukas_csrf;
  const headerToken = req.header("x-csrf-token");
  if (!cookieToken || cookieToken !== headerToken) {
    return next(new HttpError(403, "CSRF_FAILED", "CSRF token missing or invalid"));
  }
  next();
}
