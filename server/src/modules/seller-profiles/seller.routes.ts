import { loadTechnicians, loadBookings } from "../technicians/technicians.routes.js";
import {
  canPartnerManageOrder,
  findOrderById,
  loadOrders,
  mapDbOrderToRecord,
  normalizeDeliveryStatus,
  ORDER_DB_INCLUDE,
  orderMatchesSeller,
  updateOrderTracking,
  type OrderRecord
} from "../orders/orders.routes.js";
import {
  calcWeightPerMeterKg,
  orderTrackingUpdateSchema,
  sellerTmtListingSchema,
  sellerTmtQuickRateSchema,
  TMT_CATEGORY_SLUG,
  type TmtMetadata,
  type TmtVariant
} from "@etukas/shared";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { OrderStatus, Role, VerificationStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { isMissingColumnError } from "../../utils/geo.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";
import {
  getFallbackTmtListingById,
  isMissingTmtSchemaError,
  recalculateTmtVariantsFromQuickRate,
  saveFallbackTmtListing
} from "../tmt/tmt.store.js";

export const sellerRouter = Router();
sellerRouter.use(requireAuth, requireRole(Role.SELLER, Role.MANUFACTURER, Role.ADMIN));

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
  discountMinor: z.coerce.number().int().min(0).max(100_000_000).optional(),
  stockQuantity: z.coerce.number().int().min(0).max(10_000_000),
  minOrderQuantity: z.coerce.number().int().positive().max(1_000_000).optional(),
  deliveryRadiusKm: z.coerce.number().int().min(1).max(500).optional(),
  imageBase64: z.string().optional(),
  description: z.string().max(1000).optional()
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

async function sellerProfile(userId: string, email?: string) {
  let profile: any = null;
  try {
    profile = await prisma.sellerProfile.findFirst({
      where: {
        OR: [
          { userId },
          { id: userId },
          ...(email ? [{ user: { email: { equals: email, mode: "insensitive" as const } } }] : [])
        ]
      },
      include: {
        user: { select: { name: true, email: true, mobile: true } },
        stores: true
      }
    });
  } catch {
    // DB offline, fall through
  }

  const tech = loadTechnicians().find(
    (t) =>
      t.id === userId ||
      t.partnerId === userId ||
      (email && t.email.toLowerCase() === email.toLowerCase()) ||
      (profile?.user?.email && t.email.toLowerCase() === profile.user.email.toLowerCase()) ||
      (profile?.sellerId && t.partnerId.toLowerCase() === profile.sellerId.toLowerCase())
  );

  if (profile && tech) {
    const isApproved =
      profile.verificationStatus === VerificationStatus.APPROVED ||
      tech.verificationStatus === "APPROVED";
    const status = isApproved
      ? VerificationStatus.APPROVED
      : tech.verificationStatus === "REJECTED" || profile.verificationStatus === VerificationStatus.REJECTED
      ? VerificationStatus.REJECTED
      : VerificationStatus.PENDING;

    return {
      ...profile,
      sellerId: profile.sellerId || tech.partnerId,
      businessName: profile.businessName || tech.businessName,
      contactPerson: profile.contactPerson || tech.name,
      verificationStatus: status,
      isTechnician: true
    };
  }

  if (profile) {
    return profile;
  }

  if (tech) {
    const status = (tech.verificationStatus as VerificationStatus) || VerificationStatus.PENDING;
    return {
      id: tech.id,
      sellerId: tech.partnerId,
      userId: tech.id,
      contactPerson: tech.name,
      businessName: tech.businessName,
      businessType: "RETAILER" as const,
      gstin: null,
      verificationStatus: status,
      rejectionReason: tech.rejectionReason || null,
      registrationStep: 2,
      createdAt: new Date(tech.createdAt || Date.now()),
      updatedAt: new Date(),
      isTechnician: true
    };
  }

  throw new HttpError(403, "SELLER_PROFILE_REQUIRED", "Seller profile is required");
}

sellerRouter.get("/dashboard", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    if ((profile as any).isTechnician) {
      const tech = loadTechnicians().find((t) =>
        t.id === req.user!.id ||
        t.partnerId === req.user!.id ||
        t.partnerId === profile.sellerId ||
        (req.user?.email && t.email.toLowerCase() === req.user.email.toLowerCase())
      );
      const identifiers = [
        tech?.id,
        tech?.partnerId,
        tech?.mobile,
        tech?.email,
        profile.sellerId,
        profile.id,
        req.user!.id
      ].filter(Boolean) as string[];
      const bookings = await loadBookings(identifiers);
      const revenueMinor = bookings
        .filter((b: any) => b.status === "CONFIRMED" || b.status === "COMPLETED")
        .reduce((sum: number, b: any) => sum + (Number(b.estimatedTotal) || 0) * 100, 0);
      return sendOk(res, {
        sellerId: profile.sellerId,
        businessName: profile.businessName,
        contactPerson: profile.contactPerson,
        totalOrders: bookings.length,
        productsListed: tech ? tech.categories.length : 1,
        lowStockProducts: 0,
        revenueMinor,
        verificationStatus: profile.verificationStatus
      });
    }
    const storeIds: string[] = Array.isArray((profile as any).stores) && (profile as any).stores.length > 0
      ? (profile as any).stores.map((store: { id: string }) => store.id)
      : (await prisma.store.findMany({ where: { sellerProfileId: profile.id }, select: { id: true } })).map((store) => store.id);
    const [sellerOrders, products, lowStock] = await Promise.all([
      getMergedSellerOrders(profile, storeIds),
      prisma.storeProduct.count({ where: { storeId: { in: storeIds } } }),
      prisma.storeProduct.count({ where: { storeId: { in: storeIds }, stockQuantity: { lte: 10 } } })
    ]);
    const revenueMinor = sellerOrders
      .filter((ord) => ord.status === "CONFIRMED" || ord.status === "LOADING_VEHICLE" || ord.status === "ASSIGNED_DRIVER" || ord.status === "DELIVERED")
      .reduce((sum, ord) => sum + (ord.totalMinor || 0), 0);
    return sendOk(res, {
      sellerId: profile.sellerId,
      businessName: profile.businessName,
      contactPerson: profile.contactPerson,
      totalOrders: sellerOrders.length,
      productsListed: products,
      lowStockProducts: lowStock,
      revenueMinor,
      verificationStatus: profile.verificationStatus
    });
  } catch (error) {
    next(error);
  }
});

sellerRouter.get("/profile", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const tech = loadTechnicians().find(
      (t) =>
        t.id === req.user!.id ||
        t.partnerId === profile.sellerId ||
        (req.user?.email && t.email.toLowerCase() === req.user.email.toLowerCase())
    );

    const stores =
      (profile as any).stores && (profile as any).stores.length > 0
        ? (profile as any).stores
        : [
            {
              id: `store-${profile.id}`,
              name: profile.businessName,
              slug: `store-${(profile.sellerId || profile.id).toLowerCase()}`,
              phone: (profile as any).user?.mobile || tech?.mobile || "Registered Mobile",
              addressLine1: tech?.addressLine1 || "Registered Location",
              city: tech?.city || "Kakinada",
              state: tech?.state || "Andhra Pradesh",
              postalCode: tech?.postalCode || "533001",
              latitude: tech?.latitude || 16.9891,
              longitude: tech?.longitude || 82.2475,
              isActive: profile.verificationStatus === VerificationStatus.APPROVED
            }
          ];

    return sendOk(res, {
      ...profile,
      stores,
      user: (profile as any).user || {
        name: profile.contactPerson,
        email: tech?.email || req.user?.email,
        mobile: tech?.mobile || ""
      },
      isTechnician: Boolean(tech || (profile as any).isTechnician)
    });
  } catch (error) {
    next(error);
  }
});

const SELLER_LISTING_INCLUDE = {
  product: {
    include: {
      images: {
        select: {
          id: true,
          productId: true,
          url: true,
          altText: true,
          sortOrder: true
        }
      },
      category: true,
      variants: {
        orderBy: { diameterMm: "asc" as const }
      }
    }
  },
  store: true
} as const;

const SELLER_LISTING_NO_TMT_INCLUDE = {
  product: {
    include: {
      images: {
        select: {
          id: true,
          productId: true,
          url: true,
          altText: true,
          sortOrder: true
        }
      },
      category: true
    }
  },
  store: true
} as const;

const SELLER_LISTING_LEGACY_SELECT = {
  id: true,
  storeId: true,
  productId: true,
  sku: true,
  priceMinor: true,
  currency: true,
  taxRateBps: true,
  discountMinor: true,
  stockQuantity: true,
  minOrderQuantity: true,
  deliveryEta: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  ...SELLER_LISTING_NO_TMT_INCLUDE
} as const;

function mapDbVariantsToTmt(variants?: any[]): TmtVariant[] | undefined {
  if (!Array.isArray(variants) || variants.length === 0) return undefined;
  return variants.map((v) => ({
    id: v.id,
    product_id: v.productId,
    diameter_mm: Number(v.diameterMm),
    label: v.label,
    is_lite: Boolean(v.isLite),
    pieces_per_bundle: Number(v.piecesPerBundle),
    weight_per_meter_kg: Number(v.weightPerMeterKg),
    approx_weight_per_bundle_kg: Number(v.weightPerBundleKg),
    price_per_bundle_inr: Number(v.pricePerBundleInr),
    price_per_ton_inr: Number(v.pricePerTonInr),
    common_use: v.commonUse,
    stock_bundles: Number(v.stockQuantity ?? 0),
    min_order_quantity: Number(v.minOrderQuantity ?? 1),
    is_active: v.isActive !== false
  }));
}

function formatSellerListing(listing: any) {
  const fallbackTmt = getFallbackTmtListingById(listing.id);
  const mappedVariants =
    mapDbVariantsToTmt(listing.product?.variants) ?? fallbackTmt?.variants;
  const resolvedTmtMetadata =
    (listing.product?.tmtMetadata as TmtMetadata | null | undefined) ??
    fallbackTmt?.metadata ??
    null;

  return {
    ...listing,
    deliveryRadiusKm: listing.deliveryRadiusKm ?? listing.store?.serviceRadiusKm ?? 25,
    product: {
      ...listing.product,
      tmtMetadata: resolvedTmtMetadata,
      ...(mappedVariants ? { variants: mappedVariants } : {}),
      images: (listing.product?.images ?? []).map((img: any) => ({
        id: img.id,
        productId: img.productId,
        url: img.url && img.url.trim() !== ""
          ? img.url
          : `/api/v1/products/${img.productId}/images/${img.id}`,
        altText: img.altText,
        sortOrder: img.sortOrder
      }))
    }
  };
}

sellerRouter.get("/products", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    let listings: any[];
    try {
      listings = await prisma.storeProduct.findMany({
        where: { store: { sellerProfileId: profile.id } },
        include: SELLER_LISTING_INCLUDE,
        orderBy: { updatedAt: "desc" }
      });
    } catch (err) {
      if (isMissingTmtSchemaError(err)) {
        try {
          listings = await prisma.storeProduct.findMany({
            where: { store: { sellerProfileId: profile.id } },
            include: SELLER_LISTING_NO_TMT_INCLUDE,
            orderBy: { updatedAt: "desc" }
          });
        } catch (err2) {
          if (!isMissingColumnError(err2, "deliveryRadiusKm")) throw err2;
          listings = await prisma.storeProduct.findMany({
            where: { store: { sellerProfileId: profile.id } },
            select: SELLER_LISTING_LEGACY_SELECT,
            orderBy: { updatedAt: "desc" }
          });
        }
      } else if (isMissingColumnError(err, "deliveryRadiusKm")) {
        listings = await prisma.storeProduct.findMany({
          where: { store: { sellerProfileId: profile.id } },
          select: SELLER_LISTING_LEGACY_SELECT,
          orderBy: { updatedAt: "desc" }
        });
      } else {
        throw err;
      }
    }
    return sendOk(res, listings.map(formatSellerListing));
  } catch (error) {
    next(error);
  }
});

sellerRouter.post("/products", async (req, res, next) => {
  try {
    const input = newMaterialSchema.parse(req.body);
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const profileStores = Array.isArray((profile as any).stores) ? (profile as any).stores : [];
    const store =
      profileStores[0] ??
      (await prisma.store.findFirst({
        where: { sellerProfileId: profile.id },
        orderBy: { createdAt: "asc" }
      }));
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
      const match = input.imageBase64.match(/^data:([a-zA-Z0-9.+/-]+\/[a-zA-Z0-9.+/-]+);base64,(.+)$/);
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

    // Ensure category exists (single lightweight upsert outside interactive transaction)
    const category = categoryInfo[input.category];
    const dbCategory = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { isActive: true },
      create: { ...category, isActive: true }
    });

    // Pre-generate IDs so Product + ProductImage + StoreProduct + InventoryMovement
    // execute as ONE atomic nested Prisma write (no 5s interactive transaction timeout, no 500KB readback)
    const productId = randomUUID();
    const imageId = imageDataBuffer && imageMimeType ? randomUUID() : undefined;
    const sku = `ETK-${randomUUID().slice(0, 12).toUpperCase()}`;
    const slugBase = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || "material";
    const productSlug = `${slugBase}-${randomUUID().slice(0, 8)}`;
    const resolvedRadiusKm = input.deliveryRadiusKm ?? store.serviceRadiusKm ?? 25;

    const baseCreateData = {
      sku,
      priceMinor: input.priceMinor,
      discountMinor: input.discountMinor ?? 0,
      stockQuantity: input.stockQuantity,
      minOrderQuantity: input.minOrderQuantity ?? 1,
      isActive: approved,
      store: { connect: { id: store.id } },
      product: {
        create: {
          id: productId,
          categoryId: dbCategory.id,
          name: input.name,
          slug: productSlug,
          description: input.description ?? input.name,
          unit: input.unit,
          ...(imageId && imageDataBuffer && imageMimeType
            ? {
                images: {
                  create: {
                    id: imageId,
                    url: `/api/v1/products/${productId}/images/${imageId}`,
                    altText: input.name,
                    sortOrder: 0,
                    metadata: {
                      imageData: imageDataBuffer.toString("base64"),
                      mimeType: imageMimeType,
                      sizeBytes: imageSizeBytes
                    }
                  }
                }
              }
            : {})
        }
      },
      ...(input.stockQuantity > 0
        ? {
            inventoryMoves: {
              create: {
                type: "STOCK_IN" as const,
                quantity: input.stockQuantity,
                reason: "Initial seller listing"
              }
            }
          }
        : {})
    };

    let listing: any;
    try {
      listing = await prisma.storeProduct.create({
        data: {
          ...baseCreateData,
          deliveryRadiusKm: resolvedRadiusKm
        },
        include: SELLER_LISTING_INCLUDE
      });
    } catch (err) {
      if (!isMissingColumnError(err, "deliveryRadiusKm")) throw err;
      // Graceful fallback if production DB hasn't applied the deliveryRadiusKm migration yet
      listing = await prisma.storeProduct.create({
        data: baseCreateData,
        select: SELLER_LISTING_LEGACY_SELECT
      });
    }

    return sendCreated(res, formatSellerListing(listing));
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch("/products/:id", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const listing = await prisma.storeProduct.findFirst({
      where: { id: req.params.id, store: { sellerProfileId: profile.id } },
      select: { id: true, storeId: true, productId: true }
    });
    if (!listing) throw new HttpError(404, "LISTING_NOT_FOUND", "Listing not found");
    if (req.body.isActive === true && profile.verificationStatus !== VerificationStatus.APPROVED) {
      throw new HttpError(403, "SELLER_NOT_APPROVED", "Only approved sellers can publish active listings");
    }
    const updateInput = z.object({
      priceMinor: z.coerce.number().int().positive().max(100_000_000).optional(),
      discountMinor: z.coerce.number().int().min(0).max(100_000_000).optional(),
      stockQuantity: z.coerce.number().int().min(0).max(10_000_000).optional(),
      minOrderQuantity: z.coerce.number().int().positive().optional(),
      deliveryRadiusKm: z.coerce.number().int().min(1).max(500).optional(),
      isActive: z.boolean().optional(),
      name: z.string().min(2).max(200).optional(),
      unit: z.string().min(1).max(50).optional(),
      description: z.string().max(1000).optional()
    }).refine((value) => Object.keys(value).length > 0, "Provide at least one field to update").parse(req.body);
    if (updateInput.isActive === true && (!listing.storeId || profile.verificationStatus !== VerificationStatus.APPROVED)) {
      throw new HttpError(403, "SELLER_NOT_APPROVED", "Only approved sellers can publish active listings");
    }
    if (updateInput.isActive === true) {
      const store = await prisma.store.findFirst({ where: { id: listing.storeId, isActive: true }, select: { id: true } });
      if (!store) throw new HttpError(409, "STORE_INACTIVE", "Your store is inactive. Contact Etukas support.");
    }
    const { name, unit, description, ...listingFields } = updateInput;
    if (name !== undefined || unit !== undefined || description !== undefined) {
      await prisma.product.update({
        where: { id: listing.productId },
        data: {
          ...(name !== undefined && { name }),
          ...(unit !== undefined && { unit }),
          ...(description !== undefined && { description })
        }
      });
    }
    let updated: any;
    try {
      updated = await prisma.storeProduct.update({
        where: { id: listing.id },
        data: Object.keys(listingFields).length > 0 ? listingFields : {},
        include: SELLER_LISTING_INCLUDE
      });
    } catch (err) {
      if (!isMissingColumnError(err, "deliveryRadiusKm")) throw err;
      const { deliveryRadiusKm: _ignored, ...legacyFields } = listingFields;
      updated = await prisma.storeProduct.update({
        where: { id: listing.id },
        data: Object.keys(legacyFields).length > 0 ? legacyFields : {},
        select: SELLER_LISTING_LEGACY_SELECT
      });
    }
    return sendOk(res, formatSellerListing(updated));
  } catch (error) {
    next(error);
  }
});

// ─── TMT Yard Listing Configurator & Quick Daily Rate Update ─────────────────

function parseSellerBase64Image(imageBase64?: string) {
  if (!imageBase64) return null;
  const match = imageBase64.match(/^data:([a-zA-Z0-9.+/-]+\/[a-zA-Z0-9.+/-]+);base64,(.+)$/);
  if (!match) throw new HttpError(400, "INVALID_IMAGE", "Invalid image data format");
  const [, mimeType, b64data] = match;
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    throw new HttpError(400, "INVALID_IMAGE_TYPE", `Image must be one of: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
  }
  const buffer = Buffer.from(b64data, "base64");
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new HttpError(400, "IMAGE_TOO_LARGE", "Image must be under 500 KB");
  }
  return { buffer, mimeType, sizeBytes: buffer.length };
}

sellerRouter.post("/tmt-products", async (req, res, next) => {
  try {
    const input = sellerTmtListingSchema.parse(req.body);
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const profileStores = Array.isArray((profile as any).stores) ? (profile as any).stores : [];
    const store =
      profileStores[0] ??
      (await prisma.store.findFirst({
        where: { sellerProfileId: profile.id },
        orderBy: { createdAt: "asc" }
      }));
    if (!store) throw new HttpError(404, "STORE_NOT_FOUND", "Store not found");

    const approved = profile.verificationStatus === VerificationStatus.APPROVED;
    if (approved && !store.isActive) {
      throw new HttpError(409, "STORE_INACTIVE", "Your partner account is approved, but the store is inactive. Contact Etukas support.");
    }

    const parsedImage = parseSellerBase64Image(input.imageBase64);
    const dbCategory = await prisma.category.upsert({
      where: { slug: TMT_CATEGORY_SLUG },
      update: { isActive: true },
      create: {
        name: "Steel and iron bars",
        slug: TMT_CATEGORY_SLUG,
        icon: "Grip",
        isActive: true
      }
    });

    const activeVariants = input.variants.filter((v) => v.isActive);
    const totalStockBundles = activeVariants.reduce((sum, v) => sum + v.stockBundles, 0);
    const resolvedRadiusKm = input.deliveryRadiusKm ?? store.serviceRadiusKm ?? 25;
    const createdListings: any[] = [];

    for (const grade of input.grades) {
      const productId = randomUUID();
      const imageId = parsedImage ? randomUUID() : undefined;
      const sku = `TMT-${input.brandSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}-${grade.replace(/\s+/g, "")}-${randomUUID().slice(0, 5).toUpperCase()}`;
      const productName = `${input.brandName} ${grade} TMT Bars (${input.logistics.rodLengthMeters}m)`;
      const slugBase = `${input.brandSlug}-${grade.toLowerCase().replace(/\s+/g, "-")}`.slice(0, 120);
      const productSlug = `${slugBase}-${randomUUID().slice(0, 8)}`;

      const tmtMetadata: TmtMetadata = {
        brand_name: input.brandName,
        brand_slug: input.brandSlug,
        tier: input.tier,
        grade,
        base_rate_per_ton_inr: input.baseRatePerTonInr,
        supports_lite_variants: input.supportsLiteVariants,
        logistics: {
          rod_length_meters: input.logistics.rodLengthMeters,
          billing_mode: input.logistics.billingMode,
          min_order_tons: input.logistics.minOrderTons,
          free_delivery_tons: input.logistics.freeDeliveryTons,
          loading_charge_per_ton_inr: input.logistics.loadingChargePerTonInr,
          gst_included: input.logistics.gstIncluded,
          extra_6mm_per_ton_inr: input.logistics.extra6mmPerTonInr,
          extra_8mm_per_ton_inr: input.logistics.extra8mmPerTonInr,
          extra_8mm_lite_per_ton_inr: input.logistics.extra8mmLitePerTonInr
        },
        updated_at: new Date().toISOString()
      };

      const mappedVariants: TmtVariant[] = input.variants.map((v) => ({
        id: randomUUID(),
        product_id: productId,
        diameter_mm: v.diameterMm,
        label: v.label,
        is_lite: v.isLite,
        pieces_per_bundle: v.piecesPerBundle,
        weight_per_meter_kg: v.weightPerMeterKg ?? calcWeightPerMeterKg(v.diameterMm),
        approx_weight_per_bundle_kg: v.approxWeightPerBundleKg,
        price_per_bundle_inr: Math.round(v.pricePerBundleInr),
        price_per_ton_inr: Math.round(v.pricePerTonInr),
        common_use: v.commonUse,
        stock_bundles: v.stockBundles,
        min_order_quantity: v.minOrderQuantity,
        is_active: v.isActive
      }));

      const imageCreateBlock = parsedImage && imageId
        ? {
            images: {
              create: {
                id: imageId,
                url: `/api/v1/products/${productId}/images/${imageId}`,
                altText: productName,
                sortOrder: 0,
                metadata: {
                  imageData: parsedImage.buffer.toString("base64"),
                  mimeType: parsedImage.mimeType,
                  sizeBytes: parsedImage.sizeBytes
                }
              }
            }
          }
        : input.suggestedImageUrl
        ? {
            images: {
              create: {
                url: input.suggestedImageUrl,
                altText: productName,
                sortOrder: 0
              }
            }
          }
        : {};

      let listing: any;
      try {
        listing = await prisma.storeProduct.create({
          data: {
            sku,
            priceMinor: Math.round(input.baseRatePerTonInr * 100),
            discountMinor: 0,
            stockQuantity: totalStockBundles,
            minOrderQuantity: 1,
            deliveryRadiusKm: resolvedRadiusKm,
            isActive: approved,
            store: { connect: { id: store.id } },
            product: {
              create: {
                id: productId,
                categoryId: dbCategory.id,
                name: productName,
                slug: productSlug,
                brand: input.brandName,
                description:
                  input.description ||
                  `${input.brandName} ${grade} IS 1786 TMT bars (${input.logistics.rodLengthMeters}m) • ${activeVariants.map((v) => v.label).join(", ")}`,
                unit: "bundle",
                tmtMetadata: tmtMetadata as any,
                ...imageCreateBlock,
                variants: {
                  create: mappedVariants.map((v) => ({
                    id: v.id,
                    diameterMm: v.diameter_mm,
                    label: v.label,
                    isLite: Boolean(v.is_lite),
                    piecesPerBundle: v.pieces_per_bundle,
                    weightPerMeterKg: v.weight_per_meter_kg,
                    weightPerBundleKg: v.approx_weight_per_bundle_kg,
                    pricePerBundleInr: v.price_per_bundle_inr,
                    pricePerTonInr: v.price_per_ton_inr,
                    commonUse: v.common_use,
                    stockQuantity: v.stock_bundles,
                    minOrderQuantity: v.min_order_quantity ?? 1,
                    isActive: v.is_active !== false
                  }))
                }
              }
            }
          },
          include: SELLER_LISTING_INCLUDE
        });
      } catch (err) {
        if (!isMissingTmtSchemaError(err) && !isMissingColumnError(err, "deliveryRadiusKm")) {
          throw err;
        }
        listing = await prisma.storeProduct.create({
          data: {
            sku,
            priceMinor: Math.round(input.baseRatePerTonInr * 100),
            discountMinor: 0,
            stockQuantity: totalStockBundles,
            minOrderQuantity: 1,
            isActive: approved,
            store: { connect: { id: store.id } },
            product: {
              create: {
                id: productId,
                categoryId: dbCategory.id,
                name: productName,
                slug: productSlug,
                brand: input.brandName,
                description:
                  input.description ||
                  `${input.brandName} ${grade} IS 1786 TMT bars (${input.logistics.rodLengthMeters}m)`,
                unit: "bundle",
                ...imageCreateBlock
              }
            }
          },
          select: SELLER_LISTING_LEGACY_SELECT
        });
      }

      saveFallbackTmtListing({
        listingId: listing.id,
        productId: listing.productId,
        sellerProfileId: profile.id,
        storeId: store.id,
        storeName: store.name,
        storeCity: store.city,
        storeState: store.state,
        storeLat: store.latitude != null ? Number(store.latitude) : null,
        storeLng: store.longitude != null ? Number(store.longitude) : null,
        storeRadiusKm: store.serviceRadiusKm ?? 25,
        deliveryRadiusKm: resolvedRadiusKm,
        isActive: listing.isActive,
        metadata: tmtMetadata,
        variants: mappedVariants,
        updatedAt: new Date().toISOString()
      });

      createdListings.push(formatSellerListing(listing));
    }

    return sendCreated(res, {
      listings: createdListings,
      count: createdListings.length
    });
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch("/tmt-products/:listingId", async (req, res, next) => {
  try {
    const input = sellerTmtListingSchema.parse(req.body);
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const listing = await prisma.storeProduct.findFirst({
      where: { id: req.params.listingId, store: { sellerProfileId: profile.id } },
      include: { store: true, product: true }
    });
    if (!listing) throw new HttpError(404, "LISTING_NOT_FOUND", "Listing not found");

    const primaryGrade = input.grades[0];
    const activeVariants = input.variants.filter((v) => v.isActive);
    const totalStockBundles = activeVariants.reduce((sum, v) => sum + v.stockBundles, 0);
    const productName = `${input.brandName} ${primaryGrade} TMT Bars (${input.logistics.rodLengthMeters}m)`;
    const resolvedRadiusKm = input.deliveryRadiusKm ?? listing.store?.serviceRadiusKm ?? 25;

    const tmtMetadata: TmtMetadata = {
      brand_name: input.brandName,
      brand_slug: input.brandSlug,
      tier: input.tier,
      grade: primaryGrade,
      base_rate_per_ton_inr: input.baseRatePerTonInr,
      supports_lite_variants: input.supportsLiteVariants,
      logistics: {
        rod_length_meters: input.logistics.rodLengthMeters,
        billing_mode: input.logistics.billingMode,
        min_order_tons: input.logistics.minOrderTons,
        free_delivery_tons: input.logistics.freeDeliveryTons,
        loading_charge_per_ton_inr: input.logistics.loadingChargePerTonInr,
        gst_included: input.logistics.gstIncluded,
        extra_6mm_per_ton_inr: input.logistics.extra6mmPerTonInr,
        extra_8mm_per_ton_inr: input.logistics.extra8mmPerTonInr,
        extra_8mm_lite_per_ton_inr: input.logistics.extra8mmLitePerTonInr
      },
      updated_at: new Date().toISOString()
    };

    const mappedVariants: TmtVariant[] = input.variants.map((v) => ({
      id: `${listing.productId}-${v.label.toLowerCase().replace(/\s+/g, "-")}`,
      product_id: listing.productId,
      diameter_mm: v.diameterMm,
      label: v.label,
      is_lite: v.isLite,
      pieces_per_bundle: v.piecesPerBundle,
      weight_per_meter_kg: v.weightPerMeterKg ?? calcWeightPerMeterKg(v.diameterMm),
      approx_weight_per_bundle_kg: v.approxWeightPerBundleKg,
      price_per_bundle_inr: Math.round(v.pricePerBundleInr),
      price_per_ton_inr: Math.round(v.pricePerTonInr),
      common_use: v.commonUse,
      stock_bundles: v.stockBundles,
      min_order_quantity: v.minOrderQuantity,
      is_active: v.isActive
    }));

    try {
      await prisma.product.update({
        where: { id: listing.productId },
        data: {
          name: productName,
          brand: input.brandName,
          description:
            input.description ||
            `${input.brandName} ${primaryGrade} IS 1786 TMT bars (${input.logistics.rodLengthMeters}m) • ${activeVariants.map((v) => v.label).join(", ")}`,
          tmtMetadata: tmtMetadata as any
        }
      });

      for (const v of mappedVariants) {
        await prisma.productVariant.upsert({
          where: { productId_label: { productId: listing.productId, label: v.label } },
          update: {
            diameterMm: v.diameter_mm,
            isLite: Boolean(v.is_lite),
            piecesPerBundle: v.pieces_per_bundle,
            weightPerMeterKg: v.weight_per_meter_kg,
            weightPerBundleKg: v.approx_weight_per_bundle_kg,
            pricePerBundleInr: v.price_per_bundle_inr,
            pricePerTonInr: v.price_per_ton_inr,
            commonUse: v.common_use,
            stockQuantity: v.stock_bundles,
            minOrderQuantity: v.min_order_quantity ?? 1,
            isActive: v.is_active !== false
          },
          create: {
            productId: listing.productId,
            diameterMm: v.diameter_mm,
            label: v.label,
            isLite: Boolean(v.is_lite),
            piecesPerBundle: v.pieces_per_bundle,
            weightPerMeterKg: v.weight_per_meter_kg,
            weightPerBundleKg: v.approx_weight_per_bundle_kg,
            pricePerBundleInr: v.price_per_bundle_inr,
            pricePerTonInr: v.price_per_ton_inr,
            commonUse: v.common_use,
            stockQuantity: v.stock_bundles,
            minOrderQuantity: v.min_order_quantity ?? 1,
            isActive: v.is_active !== false
          }
        });
      }
    } catch (err) {
      if (!isMissingTmtSchemaError(err)) throw err;
      await prisma.product.update({
        where: { id: listing.productId },
        data: {
          name: productName,
          brand: input.brandName,
          description: input.description || productName
        }
      });
    }

    let updated: any;
    try {
      updated = await prisma.storeProduct.update({
        where: { id: listing.id },
        data: {
          priceMinor: Math.round(input.baseRatePerTonInr * 100),
          stockQuantity: totalStockBundles,
          deliveryRadiusKm: resolvedRadiusKm
        },
        include: SELLER_LISTING_INCLUDE
      });
    } catch (err) {
      if (!isMissingTmtSchemaError(err) && !isMissingColumnError(err, "deliveryRadiusKm")) {
        throw err;
      }
      updated = await prisma.storeProduct.update({
        where: { id: listing.id },
        data: {
          priceMinor: Math.round(input.baseRatePerTonInr * 100),
          stockQuantity: totalStockBundles
        },
        select: SELLER_LISTING_LEGACY_SELECT
      });
    }

    saveFallbackTmtListing({
      listingId: listing.id,
      productId: listing.productId,
      sellerProfileId: profile.id,
      storeId: listing.storeId,
      storeName: listing.store.name,
      storeCity: listing.store.city,
      storeState: listing.store.state,
      storeLat: listing.store.latitude != null ? Number(listing.store.latitude) : null,
      storeLng: listing.store.longitude != null ? Number(listing.store.longitude) : null,
      storeRadiusKm: listing.store.serviceRadiusKm ?? 25,
      deliveryRadiusKm: resolvedRadiusKm,
      isActive: updated.isActive,
      metadata: tmtMetadata,
      variants: mappedVariants,
      updatedAt: new Date().toISOString()
    });

    return sendOk(res, formatSellerListing(updated));
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch("/tmt-products/:listingId/quick-rate", async (req, res, next) => {
  try {
    const input = sellerTmtQuickRateSchema.parse(req.body);
    const profile = await sellerProfile(req.user!.id, req.user?.email);

    let listing: any;
    try {
      listing = await prisma.storeProduct.findFirst({
        where: { id: req.params.listingId, store: { sellerProfileId: profile.id } },
        include: SELLER_LISTING_INCLUDE
      });
    } catch (err) {
      if (!isMissingTmtSchemaError(err)) throw err;
      listing = await prisma.storeProduct.findFirst({
        where: { id: req.params.listingId, store: { sellerProfileId: profile.id } },
        select: SELLER_LISTING_LEGACY_SELECT
      });
    }
    if (!listing) throw new HttpError(404, "LISTING_NOT_FOUND", "Listing not found");

    const fallback = getFallbackTmtListingById(listing.id);
    const existingMeta =
      (listing.product?.tmtMetadata as TmtMetadata | null | undefined) ?? fallback?.metadata;
    const existingVariants =
      mapDbVariantsToTmt(listing.product?.variants) ?? fallback?.variants ?? [];

    if (!existingMeta || existingVariants.length === 0) {
      throw new HttpError(400, "NOT_A_TMT_LISTING", "This listing does not have TMT variant configuration");
    }

    const { updatedMetadata, updatedVariants } = recalculateTmtVariantsFromQuickRate(
      existingVariants,
      existingMeta,
      input
    );

    try {
      await prisma.product.update({
        where: { id: listing.productId },
        data: { tmtMetadata: updatedMetadata as any }
      });

      for (const v of updatedVariants) {
        await prisma.productVariant.updateMany({
          where: { productId: listing.productId, label: v.label },
          data: {
            pricePerBundleInr: v.price_per_bundle_inr,
            pricePerTonInr: v.price_per_ton_inr
          }
        });
      }
    } catch (err) {
      if (!isMissingTmtSchemaError(err)) throw err;
    }

    let updated: any;
    try {
      updated = await prisma.storeProduct.update({
        where: { id: listing.id },
        data: { priceMinor: Math.round(input.baseRatePerTonInr * 100) },
        include: SELLER_LISTING_INCLUDE
      });
    } catch (err) {
      if (!isMissingTmtSchemaError(err) && !isMissingColumnError(err, "deliveryRadiusKm")) {
        throw err;
      }
      updated = await prisma.storeProduct.update({
        where: { id: listing.id },
        data: { priceMinor: Math.round(input.baseRatePerTonInr * 100) },
        select: SELLER_LISTING_LEGACY_SELECT
      });
    }

    saveFallbackTmtListing({
      listingId: listing.id,
      productId: listing.productId,
      sellerProfileId: profile.id,
      storeId: listing.storeId,
      storeName: listing.store.name,
      storeCity: listing.store.city,
      storeState: listing.store.state,
      storeLat: listing.store.latitude != null ? Number(listing.store.latitude) : null,
      storeLng: listing.store.longitude != null ? Number(listing.store.longitude) : null,
      storeRadiusKm: listing.store.serviceRadiusKm ?? 25,
      deliveryRadiusKm: updated.deliveryRadiusKm ?? listing.store?.serviceRadiusKm ?? 25,
      isActive: updated.isActive,
      metadata: updatedMetadata,
      variants: updatedVariants,
      updatedAt: new Date().toISOString()
    });

    return sendOk(res, formatSellerListing(updated));
  } catch (error) {
    next(error);
  }
});

// Serve product image binary from DB metadata
sellerRouter.get("/products/:listingId/images/:imageId/data", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const listing = await prisma.storeProduct.findFirst({
      where: { id: req.params.listingId, store: { sellerProfileId: profile.id } },
      select: { productId: true }
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
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const listing = await prisma.storeProduct.findFirst({
      where: { id: req.params.listingId, store: { sellerProfileId: profile.id } },
      select: {
        productId: true,
        product: {
          select: {
            name: true,
            _count: { select: { images: true } }
          }
        }
      }
    });
    if (!listing) throw new HttpError(404, "LISTING_NOT_FOUND", "Listing not found");

    const { imageBase64 } = z.object({ imageBase64: z.string() }).parse(req.body);
    const match = imageBase64.match(/^data:([a-zA-Z0-9.+/-]+\/[a-zA-Z0-9.+/-]+);base64,(.+)$/);
    if (!match) throw new HttpError(400, "INVALID_IMAGE", "Invalid image data format");
    const [, mimeType, b64data] = match;
    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new HttpError(400, "INVALID_IMAGE_TYPE", `Image must be one of: ${ALLOWED_IMAGE_TYPES.join(", ")}`);
    }
    const imageBuffer = Buffer.from(b64data, "base64");
    if (imageBuffer.length > MAX_IMAGE_SIZE_BYTES) {
      throw new HttpError(400, "IMAGE_TOO_LARGE", "Image must be under 500 KB");
    }

    const imageId = randomUUID();
    const publicUrl = `/api/v1/products/${listing.productId}/images/${imageId}`;
    const image = await prisma.productImage.create({
      data: {
        id: imageId,
        productId: listing.productId,
        url: publicUrl,
        altText: listing.product.name,
        sortOrder: listing.product._count.images,
        metadata: {
          imageData: imageBuffer.toString("base64"),
          mimeType,
          sizeBytes: imageBuffer.length
        }
      },
      select: { id: true, productId: true, url: true, altText: true, sortOrder: true }
    });
    return sendCreated(res, {
      id: image.id,
      productId: image.productId,
      url: image.url,
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
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const listing = await prisma.storeProduct.findFirst({
      where: { id: req.params.listingId, store: { sellerProfileId: profile.id } },
      select: { productId: true }
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

async function getMergedSellerOrders(
  profile: { id: string; sellerId?: string | null },
  knownStoreIds?: string[]
): Promise<OrderRecord[]> {
  let storeIds = knownStoreIds;
  if (!storeIds) {
    try {
      storeIds = (
        await prisma.store.findMany({
          where: { sellerProfileId: profile.id },
          select: { id: true }
        })
      ).map((store) => store.id);
    } catch {
      storeIds = [];
    }
  }

  const orderMap = new Map<string, OrderRecord>();

  // 1. Primary: PostgreSQL orders for this partner's stores
  try {
    const dbOrders = await prisma.order.findMany({
      where: { store: { sellerProfileId: profile.id } },
      include: ORDER_DB_INCLUDE,
      orderBy: { createdAt: "desc" }
    });
    for (const ord of dbOrders) {
      const mapped = mapDbOrderToRecord(ord);
      orderMap.set(mapped.id, mapped);
    }
  } catch {}

  // 2. Fallback: file/memory orders strictly belonging to this partner (never leak other partners' orders)
  const fileOrders = loadOrders().filter((o) => orderMatchesSeller(o, profile, storeIds!));
  for (const ord of fileOrders) {
    if (!orderMap.has(ord.id)) {
      orderMap.set(ord.id, { ...ord, status: normalizeDeliveryStatus(ord.status) });
    }
  }

  return Array.from(orderMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

sellerRouter.get("/orders", async (req, res, next) => {
  try {
    const profile = await sellerProfile(req.user!.id, req.user?.email);
    const orders = await getMergedSellerOrders(profile);
    return sendOk(res, orders);
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch("/orders/:id/tracking", async (req, res, next) => {
  try {
    const existing = await findOrderById(req.params.id);
    if (!existing) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }
    const isAdmin = req.user!.roles.includes(Role.ADMIN);
    if (!isAdmin) {
      const canManage = await canPartnerManageOrder(existing, req.user!);
      if (!canManage) {
        throw new HttpError(403, "FORBIDDEN", "You do not have permission to update this order");
      }
    }
    const input = orderTrackingUpdateSchema.parse(req.body);
    const updated = await updateOrderTracking(req.params.id, input, isAdmin ? "Admin" : "Partner", { isAdmin });
    if (!updated) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    return sendOk(res, updated);
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch("/orders/:id/status", async (req, res, next) => {
  try {
    const existing = await findOrderById(req.params.id);
    if (!existing) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }
    const isAdmin = req.user!.roles.includes(Role.ADMIN);
    if (!isAdmin) {
      const canManage = await canPartnerManageOrder(existing, req.user!);
      if (!canManage) {
        throw new HttpError(403, "FORBIDDEN", "You do not have permission to update this order");
      }
    }
    const parsed = orderTrackingUpdateSchema.parse({
      ...req.body,
      status: req.body?.status === "ACCEPTED" ? "CONFIRMED" : req.body?.status
    });
    const updated = await updateOrderTracking(req.params.id, parsed, isAdmin ? "Admin" : "Partner", { isAdmin });
    if (!updated) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }
    return sendOk(res, updated);
  } catch (error) {
    next(error);
  }
});

sellerRouter.get("/notifications", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 30
    });
    return sendOk(res, notifications);
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch("/notifications/read", async (req, res, next) => {
  try {
    const { ids } = z.object({ ids: z.array(z.string()).optional() }).parse(req.body ?? {});
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.id,
        readAt: null,
        ...(ids && ids.length > 0 ? { id: { in: ids } } : {})
      },
      data: { readAt: new Date() }
    });
    return sendOk(res, { success: true });
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
