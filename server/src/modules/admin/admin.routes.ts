import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { Router } from "express";
import { Role, VerificationStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { HttpError, sendOk } from "../../utils/http.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole(Role.ADMIN));

adminRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const [users, sellers, stores, orders, products] = await Promise.all([
      prisma.user.count(),
      prisma.sellerProfile.count(),
      prisma.store.count(),
      prisma.order.count(),
      prisma.product.count()
    ]);
    return sendOk(res, { users, sellers, stores, orders, products });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/sellers", async (_req, res, next) => {
  try {
    const sellers = await prisma.sellerProfile.findMany({
      include: {
        user: { select: { name: true, email: true, mobile: true } },
        stores: {
          select: {
            id: true,
            name: true,
            phone: true,
            addressLine1: true,
            city: true,
            state: true,
            postalCode: true,
            latitude: true,
            longitude: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    return sendOk(res, sellers);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/banners", async (_req, res, next) => {
  try {
    const banners = await prisma.homepageBanner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
    return sendOk(res, banners);
  } catch (error) {
    next(error);
  }
});

const bannerInputSchema = z.object({
  eyebrow: z.string().trim().max(100).default(""),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(300).default(""),
  imageUrl: z.string().url(),
  mobileImageUrl: z.string().url().optional().nullable(),
  linkUrl: z.string().trim().max(1000).optional().nullable(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  isActive: z.boolean().default(true)
});

const imageTypes = {
  "image/jpeg": { extension: ".jpg", signature: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: ".png", signature: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: ".webp", signature: (bytes: Buffer) => bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" }
} as const;

const bannerImageInputSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  imageData: z.string().min(1)
});

adminRouter.post("/banners/upload", async (req, res, next) => {
  try {
    const { contentType, imageData } = bannerImageInputSchema.parse(req.body);
    const imageType = imageTypes[contentType];
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageData)) {
      throw new HttpError(400, "INVALID_IMAGE", "Upload a JPEG, PNG, or WebP image.");
    }

    const imageBuffer = Buffer.from(imageData, "base64");
    if (imageBuffer.length === 0 || imageBuffer.length > 5 * 1024 * 1024 || !imageType.signature(imageBuffer)) {
      throw new HttpError(400, "INVALID_IMAGE", "The image is invalid or exceeds the 5 MB limit.");
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new HttpError(503, "BLOB_STORAGE_NOT_CONFIGURED", "Image storage is not configured on the backend.");
    }

    const blob = await put(`homepage-banners/${randomUUID()}${imageType.extension}`, imageBuffer, {
      access: "public",
      addRandomSuffix: false,
      contentType,
      token
    });
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, action: "HOMEPAGE_BANNER_IMAGE_UPLOADED", target: blob.url }
    });
    return sendOk(res, { url: blob.url }, 201);
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/banners", async (req, res, next) => {
  try {
    const input = bannerInputSchema.parse(req.body);
    const banner = await prisma.homepageBanner.create({ data: input });
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, action: "HOMEPAGE_BANNER_CREATED", target: banner.id }
    });
    return sendOk(res, banner, 201);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/banners/:id", async (req, res, next) => {
  try {
    const input = bannerInputSchema.partial().parse(req.body);
    const banner = await prisma.homepageBanner.update({ where: { id: req.params.id }, data: input });
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, action: "HOMEPAGE_BANNER_UPDATED", target: banner.id }
    });
    return sendOk(res, banner);
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/banners/:id", async (req, res, next) => {
  try {
    const banner = await prisma.homepageBanner.delete({ where: { id: req.params.id } });
    await prisma.auditLog.create({
      data: { actorId: req.user!.id, action: "HOMEPAGE_BANNER_DELETED", target: banner.id }
    });
    return sendOk(res, { id: banner.id });
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/seller-enquiries", async (_req, res, next) => {
  try {
    const enquiries = await prisma.sellerEnquiry.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contactPerson: true,
        businessName: true,
        email: true,
        mobile: true,
        businessType: true,
        city: true,
        state: true,
        status: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true
      }
    });
    return sendOk(res, enquiries);
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/seller-enquiries/:id", async (req, res, next) => {
  try {
    const enquiry = await prisma.sellerEnquiry.findUnique({ where: { id: req.params.id } });
    if (!enquiry) throw new HttpError(404, "SELLER_ENQUIRY_NOT_FOUND", "Seller enquiry not found");
    return sendOk(res, enquiry);
  } catch (error) {
    next(error);
  }
});

adminRouter.patch("/sellers/:id/status", async (req, res, next) => {
  try {
    const { status, rejectionReason } = z.object({
      status: z.nativeEnum(VerificationStatus),
      rejectionReason: z.string().trim().max(500).optional()
    }).parse(req.body);
    const seller = await prisma.$transaction(async (transaction) => {
      const profile = await transaction.sellerProfile.update({
        where: { id: req.params.id },
        data: {
          verificationStatus: status,
          rejectionReason: status === VerificationStatus.REJECTED ? rejectionReason ?? null : null
        }
      });
      const isApproved = status === VerificationStatus.APPROVED;
      await transaction.store.updateMany({ where: { sellerProfileId: profile.id }, data: { isActive: isApproved } });
      await transaction.storeProduct.updateMany({
        where: { store: { sellerProfileId: profile.id } },
        data: { isActive: isApproved }
      });
      await transaction.auditLog.create({
        data: { actorId: req.user!.id, action: "SELLER_STATUS_UPDATED", target: profile.id, metadata: { status } }
      });
      return profile;
    });
    return sendOk(res, seller);
  } catch (error) {
    next(error);
  }
});
