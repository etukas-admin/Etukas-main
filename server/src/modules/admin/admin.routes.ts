import { loadTechnicians, updateTechnicianStatus } from "../technicians/technicians.routes.js";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
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
    let sellers: any[] = [];
    try {
      sellers = await prisma.sellerProfile.findMany({
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
    } catch {
      // Prisma offline, continue with technician file store
    }

    // Merge in technicians from technicians.json
    try {
      const technicians = loadTechnicians();
      const techAsSellers = technicians
        .map((tech) => {
          const existing = sellers.find(
            (s) =>
              (s.sellerId && s.sellerId.toLowerCase() === tech.partnerId.toLowerCase()) ||
              s.id === tech.id ||
              (s.user?.email && s.user.email.toLowerCase() === tech.email.toLowerCase()) ||
              (s.user?.mobile && s.user.mobile === tech.mobile)
          );
          if (existing) {
            // Keep status aligned with technician JSON if present
            if (tech.verificationStatus) {
              existing.verificationStatus = tech.verificationStatus;
            }
            return null;
          }
          return {
            id: tech.id,
            sellerId: tech.partnerId,
            contactPerson: tech.name,
            businessName: tech.businessName,
            businessType: "TECHNICIAN",
            gstin: null,
            verificationStatus: tech.verificationStatus || "APPROVED",
            rejectionReason: tech.rejectionReason || null,
            createdAt: tech.createdAt,
            user: {
              name: tech.name,
              email: tech.email,
              mobile: tech.mobile
            },
            stores: [
              {
                id: `store-${tech.id}`,
                name: tech.businessName,
                phone: tech.mobile,
                addressLine1: tech.addressLine1,
                city: tech.city,
                state: tech.state,
                postalCode: tech.postalCode,
                latitude: tech.latitude,
                longitude: tech.longitude,
                isActive: (tech.verificationStatus || "APPROVED") === "APPROVED"
              }
            ]
          };
        })
        .filter(Boolean);

      sellers = [...sellers, ...techAsSellers];
    } catch (techErr) {
      console.warn("Could not load technicians for admin sellers list:", techErr);
    }

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

adminRouter.get("/ad-banners", async (_req, res, next) => {
  try {
    const images = await prisma.adBannerImage.findMany({
      select: { id: true, section: true, bannerNumber: true, imageUrl: true, contentType: true, sizeBytes: true, isCurrent: true, createdAt: true, updatedAt: true },
      orderBy: [{ section: "asc" }, { bannerNumber: "asc" }, { createdAt: "desc" }]
    });
    return sendOk(res, images);
  } catch (error) {
    next(error);
  }
});

const adBannerImageSchema = z.object({
  section: z.number().int().min(1).max(3),
  bannerNumber: z.number().int().min(1).max(3),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  imageData: z.string().min(1)
});

const adBannerImageTypes = {
  "image/jpeg": { extension: ".jpg", signature: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extension: ".png", signature: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: ".webp", signature: (bytes: Buffer) => bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP" }
} as const;

adminRouter.post("/ad-banners", async (req, res, next) => {
  try {
    const { section, bannerNumber, contentType, imageData } = adBannerImageSchema.parse(req.body);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imageData)) {
      throw new HttpError(400, "INVALID_IMAGE", "Upload a JPEG, PNG, or WebP image.");
    }
    const imageBuffer = Buffer.from(imageData, "base64");
    const imageType = adBannerImageTypes[contentType];
    if (imageBuffer.length === 0 || imageBuffer.length > 500 * 1024 || !imageType.signature(imageBuffer)) {
      throw new HttpError(400, "INVALID_IMAGE", "The image is invalid or exceeds the 500 KB limit.");
    }
    const image = await prisma.$transaction(async (tx) => {
      await tx.adBannerImage.updateMany({ where: { section, bannerNumber, isCurrent: true }, data: { isCurrent: false } });
      return tx.adBannerImage.create({
        data: { section, bannerNumber, imageUrl: null, imageData: imageBuffer, contentType, sizeBytes: imageBuffer.length, isCurrent: true },
        select: { id: true, section: true, bannerNumber: true, imageUrl: true, contentType: true, sizeBytes: true, isCurrent: true, createdAt: true, updatedAt: true }
      });
    });
    await prisma.auditLog.create({ data: { actorId: req.user!.id, action: "AD_BANNER_IMAGE_UPLOADED", target: image.id } });
    return sendOk(res, image, 201);
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/ad-banners/:id", async (req, res, next) => {
  try {
    const image = await prisma.adBannerImage.findUnique({ where: { id: req.params.id } });
    if (!image) throw new HttpError(404, "AD_BANNER_NOT_FOUND", "Ad banner image not found.");
    if (image.imageUrl) await deleteHomepageBannerBlob(image.imageUrl);
    await prisma.adBannerImage.delete({ where: { id: image.id } });
    await prisma.auditLog.create({ data: { actorId: req.user!.id, action: "AD_BANNER_IMAGE_DELETED", target: image.id } });
    return sendOk(res, { id: image.id });
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

async function deleteHomepageBannerBlob(imageUrl: string) {
  let hostname: string;
  try {
    hostname = new URL(imageUrl).hostname;
  } catch {
    return;
  }
  if (!hostname.endsWith(".blob.vercel-storage.com")) return;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new HttpError(503, "BLOB_STORAGE_NOT_CONFIGURED", "Image storage is not configured on the backend.");
  await del(imageUrl, { token });
}

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
    const existing = await prisma.homepageBanner.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "BANNER_NOT_FOUND", "Homepage banner not found.");
    const banner = await prisma.homepageBanner.update({ where: { id: req.params.id }, data: input });
    if (input.imageUrl && input.imageUrl !== existing.imageUrl) await deleteHomepageBannerBlob(existing.imageUrl);
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
    const banner = await prisma.homepageBanner.findUnique({ where: { id: req.params.id } });
    if (!banner) throw new HttpError(404, "BANNER_NOT_FOUND", "Homepage banner not found.");
    await deleteHomepageBannerBlob(banner.imageUrl);
    await prisma.homepageBanner.delete({ where: { id: banner.id } });
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

    const targetId = req.params.id;
    let updatedTechnician = updateTechnicianStatus(targetId, status as any, rejectionReason);
    let updatedProfile: any = null;

    try {
      const existingProfile = await prisma.sellerProfile.findFirst({
        where: {
          OR: [
            { id: targetId },
            { sellerId: targetId },
            { userId: targetId }
          ]
        },
        include: { user: true }
      });

      if (existingProfile) {
        updatedProfile = await prisma.$transaction(async (transaction) => {
          const profile = await transaction.sellerProfile.update({
            where: { id: existingProfile.id },
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
          }).catch(() => {});
          return profile;
        });

        if (!updatedTechnician && existingProfile.user?.email) {
          updatedTechnician = updateTechnicianStatus(existingProfile.user.email, status as any, rejectionReason);
        }
      }
    } catch (dbErr) {
      console.warn("Prisma update status skipped or failed:", dbErr);
    }

    if (updatedProfile) {
      return sendOk(res, updatedProfile);
    }

    if (updatedTechnician) {
      return sendOk(res, {
        id: updatedTechnician.id,
        sellerId: updatedTechnician.partnerId,
        contactPerson: updatedTechnician.name,
        businessName: updatedTechnician.businessName,
        businessType: "TECHNICIAN",
        verificationStatus: updatedTechnician.verificationStatus,
        rejectionReason: updatedTechnician.rejectionReason ?? null
      });
    }

    throw new HttpError(404, "SELLER_NOT_FOUND", "Partner profile not found");
  } catch (error) {
    next(error);
  }
});
