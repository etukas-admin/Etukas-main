import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/http.js";

export type AuthUser = {
  id: string;
  email: string;
  roles: Role[];
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function signAccessToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_ACCESS_SECRET, { expiresIn: "7d" });
}

export function signRefreshToken(user: AuthUser) {
  return jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: "30d" });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization");
    let token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token && req.cookies?.etukas_access) {
      token = req.cookies.etukas_access;
    }
    if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Authentication required");
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthUser;
    const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, roles: true, isActive: true } });
    if (!user?.isActive) throw new HttpError(401, "UNAUTHENTICATED", "Authentication required");
    req.user = { id: user.id, email: user.email, roles: user.roles };
    next();
  } catch (error) {
    next(error instanceof HttpError ? error : new HttpError(401, "UNAUTHENTICATED", "Authentication required"));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "UNAUTHENTICATED", "Authentication required"));
    if (!req.user.roles.some((role) => roles.includes(role))) {
      return next(new HttpError(403, "FORBIDDEN", "You do not have permission to access this resource"));
    }
    next();
  };
}
