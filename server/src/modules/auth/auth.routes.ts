import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, resetPasswordSchema } from "@etukas/shared";
import { Role } from "@prisma/client";
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
        roles: [Role.CUSTOMER],
        customerProfile: { create: {} }
      },
      select: { id: true, name: true, email: true, mobile: true, roles: true }
    });
    const csrfToken = issueCsrf(res);
    return sendCreated(res, { ...user, csrfToken });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", loginLimiter, async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const loginId = (input.identifier || input.email || "").trim();

    if (!loginId) {
      throw new HttpError(400, "MISSING_IDENTIFIER", "Email, Seller ID, or Mobile number is required");
    }

    // 1. Try finding by Seller ID (e.g., SEA01234 or SEA65943)
    let user = null;
    let sellerId: string | undefined;

    const sellerProfile = await prisma.sellerProfile.findFirst({
      where: {
        sellerId: {
          equals: loginId,
          mode: "insensitive"
        }
      },
      include: { user: true }
    });

    if (sellerProfile?.user) {
      user = sellerProfile.user;
      sellerId = sellerProfile.sellerId ?? undefined;
    }

    // 2. Try finding by mobile number
    if (!user && /^\+?\d{7,15}$/.test(loginId)) {
      user = await prisma.user.findFirst({
        where: { mobile: loginId },
        include: { sellerProfile: { select: { sellerId: true } } }
      });
      if (user?.sellerProfile?.sellerId) {
        sellerId = user.sellerProfile.sellerId;
      }
    }

    // 3. Try finding by email
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          email: {
            equals: loginId,
            mode: "insensitive"
          }
        },
        include: { sellerProfile: { select: { sellerId: true } } }
      });
      if (user?.sellerProfile?.sellerId) {
        sellerId = user.sellerProfile.sellerId;
      }
    }

    if (!user || !user.isActive) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid Seller ID, email, or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid Seller ID, email, or password");
    }

    const authUser = { id: user.id, email: user.email, roles: user.roles };
    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken(authUser);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: await bcrypt.hash(refreshToken, 12) }
    });

    // Set persistent session cookies for 30 days
    res.cookie("etukas_refresh", refreshToken, cookieOptions(30 * 24 * 60 * 60 * 1000));
    res.cookie("etukas_access", accessToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    const csrfToken = issueCsrf(res);

    return sendOk(res, {
      accessToken,
      csrfToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        roles: user.roles,
        sellerId
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const loginId = input.identifier.trim();

    let user = null;

    // 1. By Seller ID
    const sellerProfile = await prisma.sellerProfile.findFirst({
      where: { sellerId: { equals: loginId, mode: "insensitive" } },
      include: { user: true }
    });
    if (sellerProfile?.user) user = sellerProfile.user;

    // 2. By mobile
    if (!user && /^\+?\d{7,15}$/.test(loginId)) {
      user = await prisma.user.findFirst({ where: { mobile: loginId } });
    }

    // 3. By email
    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: { equals: loginId, mode: "insensitive" } }
      });
    }

    if (!user) {
      throw new HttpError(404, "USER_NOT_FOUND", "No account found matching this Email, Seller ID, or Mobile number");
    }
    if (user.roles.includes(Role.ADMIN)) {
      throw new HttpError(403, "ADMIN_PASSWORD_RESET_DISABLED", "Administrator passwords must be reset by an authorized operator.");
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, refreshTokenHash: null }
    });

    return sendOk(res, {
      message: "Password reset successful! You can now log in with your new password."
    });
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
    const accessToken = signAccessToken(authUser);
    res.cookie("etukas_access", accessToken, cookieOptions(7 * 24 * 60 * 60 * 1000));
    return sendOk(res, { accessToken, csrfToken: issueCsrf(res) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.etukas_access;
    if (token) {
      try {
        const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as { id: string };
        await prisma.user.update({ where: { id: payload.id }, data: { refreshTokenHash: null } }).catch(() => {});
      } catch {}
    }
    res.clearCookie("etukas_refresh", { path: "/" });
    res.clearCookie("etukas_access", { path: "/" });
    return sendOk(res, { message: "Logged out successfully" });
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
