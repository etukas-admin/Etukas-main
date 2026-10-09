import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema } from "@etukas/shared";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { requireAuth, signAccessToken, signRefreshToken } from "../../middleware/auth.js";
import { cookieOptions, issueCsrf, loginLimiter } from "../../middleware/security.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";

export const authRouter = Router();

authRouter.get("/csrf", (_req, res) => {
  return sendOk(res, { csrfToken: issueCsrf(res) });
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        mobile: input.mobile,
        passwordHash,
        roles: [input.role],
        customerProfile: input.role === "CUSTOMER" ? { create: {} } : undefined
      },
      select: { id: true, name: true, email: true, mobile: true, roles: true }
    });
    return sendCreated(res, user);
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || !user.isActive) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    const authUser = { id: user.id, email: user.email, roles: user.roles };
    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken(authUser);
    await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) } });
    res.cookie("etukas_refresh", refreshToken, cookieOptions());
    const csrfToken = issueCsrf(res);
    return sendOk(res, { accessToken, csrfToken, user: { id: user.id, name: user.name, email: user.email, roles: user.roles } });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.etukas_refresh;
    if (!token) throw new HttpError(401, "UNAUTHENTICATED", "Refresh token missing");
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user?.refreshTokenHash || !(await bcrypt.compare(token, user.refreshTokenHash))) {
      throw new HttpError(401, "UNAUTHENTICATED", "Refresh token invalid");
    }
    const authUser = { id: user.id, email: user.email, roles: user.roles };
    return sendOk(res, { accessToken: signAccessToken(authUser), csrfToken: issueCsrf(res) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.user!.id }, data: { refreshTokenHash: null } });
    res.clearCookie("etukas_refresh", cookieOptions());
    return sendOk(res, { message: "Logged out" });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, mobile: true, roles: true, sellerProfile: { select: { verificationStatus: true, businessName: true } } }
    });
    return sendOk(res, user);
  } catch (error) {
    next(error);
  }
});
