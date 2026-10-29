import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { OrderStatus, Role, VerificationStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";

export const sellerRouter = Router();
sellerRouter.use(requireAuth, requireRole(Role.SELLER, Role.MANUFACTURER));

const MAX_IMAGE_SIZE_BYTES = 512 * 1024; // 500 KB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const newMaterialSchema = z.object({
  name: z.string().trim().min(2).max(160),
  category: z.enum([
    "cement",
    "iron",
    "electricals",
    "bricks",
    "sand",
    "stones",
    "tiles",
    "plumbing"
  ]),
  unit: z.string().trim().min(1).max(40),
  priceMinor: z.coerce.number().int().positive().max(100_000_000),
  stockQuantity: z.coerce.number().int().min(0).max(10_000_000),
  imageBase64: z.string().optional()
});

const categoryInfo: Record<z.infer<typeof newMaterialSchema>["category"], { name: string; slug: string; icon: string }> = {
  cement: { name: "Cement", slug: "cement", icon: "Package" },
  iron: { name: "Steel and iron bars", slug: "steel-iron-bars", icon: "Grip" },
  electricals: { name: "Electrical materials", slug: "electrical-materials", icon: "Cable" },
  bricks: { name: "Bricks and blocks", slug: "bricks-blocks", icon: "BrickWall" },
  sand: { name: "Sand and aggregates", slug: "sand-aggregates", icon: "Mountain" },
  stones: { name: "Stones and aggregates", slug: "stones-aggregates", icon: "Mountain" },
  tiles: { name: "Tiles and flooring", slug: "tiles-flooring", icon: "Layers" },
  plumbing: { name: "Plumbing", slug: "plumbing", icon: "Pipes" }
};

async function sellerProfile(userId: string) {
  const profile = await prisma.sellerProfile.findUnique({ where: { userId } });
  if (!profile) throw new HttpError(403, "SELLER_PROFILE_REQUIRED", "Seller profile is required");
  return profile;
}

sellerRouter.get("/dashboard", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id);
    const storeIds = (await prisma.store.findMany({ where: { sellerProfileId: profile.id }, select: { id: true } })).map((store) => store.id);
    const [orders, products, lowStock] = await Promise.all([
      prisma.order.count({ where: { storeId: { in: storeIds } } }),
      prisma.storeProduct.count({ where: { storeId: { in: storeIds } } }),
      prisma.storeProduct.count({ where: { storeId: { in: storeIds }, stockQuantity: { lte: 10 } } })
    ]);
    const revenue = await prisma.order.aggregate({ where: { storeId: { in: storeIds }, status: { in: [OrderStatus.DELIVERED, OrderStatus.DISPATCHED, OrderStatus.ACCEPTED] } }, _sum: { totalMinor: true } });
    return sendOk(res, {
      sellerId: profile.sellerId,
      businessName: profile.businessName,
      contactPerson: profile.contactPerson,
      totalOrders: orders,
      productsListed: products,
      lowStockProducts: lowStock,
      revenueMinor: revenue._sum.totalMinor ?? 0,
      verificationStatus: profile.verificationStatus
    });
  } catch (error) {
    next(error);
  }
});

sellerRouter.get("/profile", async (req, res, next) => {
  try {
    const profile = await prisma.sellerProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        user: { select: { name: true, email: true, mobile: true } },
        stores: true
      }
    });
    if (!profile) throw new HttpError(404, "SELLER_NOT_FOUND", "Seller profile not found");
    return sendOk(res, profile);
  } catch (error) {
    next(error);
  }
});

sellerRouter.get("/products", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id);
    const listings = await prisma.storeProduct.findMany({
      where: { store: { sellerProfileId: profile.id } },
      include: { product: { include: { images: true, category: true } }, store: true },
      orderBy: { updatedAt: "desc" }
    });
    return sendOk(res, listings);
  } catch (error) {
    next(error);
  }
});

sellerRouter.post("/products", async (req, res, next) => {
  try {
    const input = newMaterialSchema.parse(req.body);
    const profile = await sellerProfile(req.user!.id);
    const store = await prisma.store.findFirst({
      where: { sellerProfileId: profile.id },
      orderBy: { createdAt: "asc" }
    });
    if (!store) throw new HttpError(404, "STORE_NOT_FOUND", "Store not found");

    const approved = profile.verificationStatus === VerificationStatus.APPROVED;
    if (approved && !store.isActive) {
      throw new HttpError(409, "STORE_INACTIVE", "Your partner account is approved, but the store is inactive. Contact Etukas support.");
    }

    // Validate image if provided
    let imageDataBuffer: Buffer | undefined;
    let imageMimeType: string | undefined;
    let imageSizeBytes: number | undefined;
    if (input.imageBase64) {
      const match = input.imageBase64.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/);
      if (!match) throw new HttpError(400, "INVALID_IMAGE", "Invalid image data format");
      const [, mimeType, b64data] = match;
      if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        throw new HttpError(400, "INVALID_IMAGE_TYPE", `Image must be one of: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
      }
      imageDataBuffer = Buffer.from(b64data, "base64");
      if (imageDataBuffer.length > MAX_IMAGE_SIZE_BYTES) {
        throw new HttpError(400, "IMAGE_TOO_LARGE", "Image must be under 500 KB");
      }
      imageMimeType = mimeType;
      imageSizeBytes = imageDataBuffer.length;
    }

    const listing = await prisma.$transaction(async (transaction) => {
      const category = categoryInfo[input.category];
      const dbCategory = await transaction.category.upsert({
        where: { slug: category.slug },
        update: { isActive: true },
        create: { ...category, isActive: true }
      });
      const product = await transaction.product.create({
        data: {
          categoryId: dbCategory.id,
          name: input.name,
          slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120)}-${randomUUID().slice(0, 8)}`,
          description: input.name,
          unit: input.unit
        }
      });
      // Create product image if provided
      if (imageDataBuffer && imageMimeType) {
        await transaction.productImage.create({
          data: {
            productId: product.id,
            url: "",
            altText: input.name,
            sortOrder: 0,
            metadata: {
              imageData: imageDataBuffer.toString("base64"),
              mimeType: imageMimeType,
              sizeBytes: imageSizeBytes
            }
          }
        });
      }
      const newListing = await transaction.storeProduct.create({
        data: {
          productId: product.id,
          storeId: store.id,
          sku: `ETK-${randomUUID().slice(0, 12).toUpperCase()}`,
          priceMinor: input.priceMinor,
          stockQuantity: input.stockQuantity,
          minOrderQuantity: 1,
          isActive: approved
        },
        include: {
          product: { include: { images: true, category: true } },
          store: true
        }
      });
      if (input.stockQuantity > 0) {
        await transaction.inventoryMovement.create({
          data: {
            storeProductId: newListing.id,
            type: "STOCK_IN",
            quantity: input.stockQuantity,
            reason: "Initial seller listing"
          }
        });
      }
      return newListing;
    });
    return sendCreated(res, listing);
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch("/products/:id", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id);
    const listing = await prisma.storeProduct.findFirst({ where: { id: req.params.id, store: { sellerProfileId: profile.id } } });
    if (!listing) throw new HttpError(404, "LISTING_NOT_FOUND", "Listing not found");
    if (req.body.isActive === true && profile.verificationStatus !== VerificationStatus.APPROVED) {
      throw new HttpError(403, "SELLER_NOT_APPROVED", "Only approved sellers can publish active listings");
    }
    const updateInput = z.object({
      priceMinor: z.coerce.number().int().positive().max(100_000_000).optional(),
      stockQuantity: z.coerce.number().int().min(0).max(10_000_000).optional(),
      minOrderQuantity: z.coerce.number().int().positive().optional(),
      isActive: z.boolean().optional()
    }).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update").parse(req.body);
    if (updateInput.isActive === true && (!listing.storeId || profile.verificationStatus !== VerificationStatus.APPROVED)) {
      throw new HttpError(403, "SELLER_NOT_APPROVED", "Only approved sellers can publish active listings");
    }
    if (updateInput.isActive === true) {
      const store = await prisma.store.findFirst({ where: { id: listing.storeId, isActive: true } });
      if (!store) throw new HttpError(409, "STORE_INACTIVE", "Your store is inactive. Contact Etukas support.");
    }
    const updated = await prisma.storeProduct.update({
      where: { id: listing.id },
      data: updateInput,
      include: {
        product: { include: { images: true, category: true } },
        store: true
      }
    });
    return sendOk(res, updated);
  } catch (error) {
    next(error);
  }
});

// Serve product image binary from DB metadata
sellerRouter.get("/products/:listingId/images/:imageId/data", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id);
    const listing = await prisma.storeProduct.findFirst({
      where: { id: req.params.listingId, store: { sellerProfileId: profile.id } },
      include: { product: true }
    });
    if (!listing) throw new HttpError(404, "LISTING_NOT_FOUND", "Listing not found");
    const image = await prisma.productImage.findFirst({
      where: { id: req.params.imageId, productId: listing.productId }
    });
    if (!image) throw new HttpError(404, "IMAGE_NOT_FOUND", "Image not found");
    const meta = image.metadata as { imageData?: string; mimeType?: string } | null;
    if (!meta?.imageData || !meta.mimeType) throw new HttpError(404, "IMAGE_DATA_NOT_FOUND", "Image data not found");
    res.setHeader("Content-Type", meta.mimeType);
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(Buffer.from(meta.imageData, "base64"));
  } catch (error) {
    next(error);
  }
});

// Upload a new image for an existing product listing
sellerRouter.post("/products/:listingId/images", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id);
    const listing = await prisma.storeProduct.findFirst({
      where: { id: req.params.listingId, store: { sellerProfileId: profile.id } },
      include: { product: { include: { images: true } } }
    });
    if (!listing) throw new HttpError(404, "LISTING_NOT_FOUND", "Listing not found");

    const { imageBase64 } = z.object({ imageBase64: z.string() }).parse(req.body);
    const match = imageBase64.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,(.+)$/);
    if (!match) throw new HttpError(400, "INVALID_IMAGE", "Invalid image data format");
    const [, mimeType, b64data] = match;
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new HttpError(400, "INVALID_IMAGE_TYPE", `Image must be one of: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
    }
    const imageBuffer = Buffer.from(b64data, "base64");
    if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new HttpError(400, "IMAGE_TOO_LARGE", "Image must be under 500 KB");
    }

    const image = await prisma.productImage.create({
      data: {
        productId: listing.productId,
        url: "",
        altText: listing.product.name,
        sortOrder: listing.product.images.length,
        metadata: {
          imageData: imageBuffer.toString("base64"),
          mimeType,
          sizeBytes: imageBuffer.length
        }
      }
    });
    return sendCreated(res, {
      id: image.id,
      productId: image.productId,
      altText: image.altText,
      sortOrder: image.sortOrder,
      sizeBytes: imageBuffer.length,
      mimeType
    });
  } catch (error) {
    next(error);
  }
});

// Delete a product image
sellerRouter.delete("/products/:listingId/images/:imageId", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id);
    const listing = await prisma.storeProduct.findFirst({
      where: { id: req.params.listingId, store: { sellerProfileId: profile.id } }
    });
    if (!listing) throw new HttpError(404, "LISTING_NOT_FOUND", "Listing not found");
    const image = await prisma.productImage.findFirst({
      where: { id: req.params.imageId, productId: listing.productId }
    });
    if (!image) throw new HttpError(404, "IMAGE_NOT_FOUND", "Image not found");
    await prisma.productImage.delete({ where: { id: image.id } });
    return sendOk(res, { id: image.id });
  } catch (error) {
    next(error);
  }
});

sellerRouter.get("/orders", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id);
    const orders = await prisma.order.findMany({
      where: { store: { sellerProfileId: profile.id } },
      include: { items: true, customer: { select: { name: true, mobile: true } }, address: true },
      orderBy: { createdAt: "desc" }
    });
    return sendOk(res, orders);
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const status = req.body.status as OrderStatus;
    if (!Object.values(OrderStatus).includes(status)) throw new HttpError(400, "INVALID_STATUS", "Invalid order status");
    const profile = await sellerProfile(req.user!.id);
    const order = await prisma.order.findFirst({ where: { id: req.params.id, store: { sellerProfileId: profile.id } } });
    if (!order) throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    return sendOk(res, await prisma.order.update({ where: { id: order.id }, data: { status } }));
  } catch (error) {
    next(error);
  }
});

sellerRouter.get("/inventory", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id);
    const inventory = await prisma.storeProduct.findMany({ where: { store: { sellerProfileId: profile.id } }, include: { product: true, store: true } });
    return sendOk(res, inventory);
  } catch (error) {
    next(error);
  }
});
