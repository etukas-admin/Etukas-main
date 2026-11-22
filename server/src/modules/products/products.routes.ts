import { Router } from "express";
import { productQuerySchema } from "@etukas/shared";
import { prisma } from "../../config/prisma.js";
import { evaluateProductDeliveryRange, parseCoordinate } from "../../utils/geo.js";
import { HttpError, sendOk } from "../../utils/http.js";
import { loadOrders } from "../orders/orders.routes.js";

export const productsRouter = Router();

function formatStoreProduct<T extends { product: { id: string; images: Array<{ id: string; productId: string; url: string; altText: string; sortOrder: number; metadata?: unknown }> } }>(item: T) {
  return {
    ...item,
    product: {
      ...item.product,
      images: item.product.images.map((img) => ({
        id: img.id,
        productId: img.productId,
        url: (img.url && img.url.trim() !== "")
          ? img.url
          : `/api/v1/products/${img.productId}/images/${img.id}`,
        altText: img.altText,
        sortOrder: img.sortOrder
      }))
    }
  };
}

// Public product image serving endpoints (placed before /:id)
productsRouter.get(["/:productId/images/:imageId", "/:productId/images/:imageId/data"], async (req, res, next) => {
  try {
    const { productId, imageId } = req.params;
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId }
    });
    if (!image) throw new HttpError(404, "IMAGE_NOT_FOUND", "Product image not found");
    const meta = image.metadata as { imageData?: string; mimeType?: string } | null;
    if (meta?.imageData && meta.mimeType) {
      res.setHeader("Content-Type", meta.mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.send(Buffer.from(meta.imageData, "base64"));
    }
    if (image.url && image.url.trim() !== "") {
      return res.redirect(image.url);
    }
    throw new HttpError(404, "IMAGE_DATA_NOT_FOUND", "Image data not found");
  } catch (error) {
    next(error);
  }
});

productsRouter.get(["/images/:imageId", "/images/:imageId/data"], async (req, res, next) => {
  try {
    const { imageId } = req.params;
    const image = await prisma.productImage.findUnique({
      where: { id: imageId }
    });
    if (!image) throw new HttpError(404, "IMAGE_NOT_FOUND", "Product image not found");
    const meta = image.metadata as { imageData?: string; mimeType?: string } | null;
    if (meta?.imageData && meta.mimeType) {
      res.setHeader("Content-Type", meta.mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.send(Buffer.from(meta.imageData, "base64"));
    }
    if (image.url && image.url.trim() !== "") {
      return res.redirect(image.url);
    }
    throw new HttpError(404, "IMAGE_DATA_NOT_FOUND", "Image data not found");
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/", async (req, res, next) => {
  try {
    const query = productQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.pageSize;
    const productFilters: Record<string, unknown> = {};
    if (query.category) {
      productFilters.category = { slug: query.category };
    }
    const andConditions: Record<string, unknown>[] = [];
    if (query.q) {
      andConditions.push({
        OR: [
          { name: { contains: query.q, mode: "insensitive" as const } },
          { description: { contains: query.q, mode: "insensitive" as const } },
          { brand: { contains: query.q, mode: "insensitive" as const } }
        ]
      });
    }
    if (query.brand) {
      andConditions.push({
        OR: [
          { brand: { contains: query.brand, mode: "insensitive" as const } },
          { name: { contains: query.brand, mode: "insensitive" as const } }
        ]
      });
    }
    if (andConditions.length > 0) {
      productFilters.AND = andConditions;
    }

    const where = {
      isActive: true,
      store: {
        isActive: true,
        sellerProfile: { verificationStatus: "APPROVED" as const }
      },
      product: productFilters
    };
    const orderBy =
      query.sort === "price_asc"
        ? { priceMinor: "asc" as const }
        : query.sort === "price_desc"
        ? { priceMinor: "desc" as const }
        : { updatedAt: "desc" as const };

    const include = {
      product: {
        include: {
          category: true,
          images: {
            select: {
              id: true,
              productId: true,
              url: true,
              altText: true,
              sortOrder: true
            }
          }
        }
      },
      store: true
    };

    const hasCoordinates = query.latitude !== undefined && query.longitude !== undefined;

    if (hasCoordinates) {
      // Fetch matching listings and strictly filter by each product's partner-configured delivery radius
      const candidates = await prisma.storeProduct.findMany({
        where,
        include,
        orderBy
      });

      const deliverableItems = candidates
        .map((item) => {
          const range = evaluateProductDeliveryRange({
            customerLat: query.latitude,
            customerLng: query.longitude,
            customerCity: query.city,
            storeLat: item.store.latitude,
            storeLng: item.store.longitude,
            storeCity: item.store.city,
            productRadiusKm: item.deliveryRadiusKm,
            storeRadiusKm: item.store.serviceRadiusKm
          });
          return {
            ...formatStoreProduct(item),
            deliveryRadiusKm: range.deliveryRadiusKm,
            distanceKm: range.distanceKm,
            isDeliverable: range.isDeliverable
          };
        })
        .filter((item) => item.isDeliverable);

      if (query.sort === "relevance") {
        deliverableItems.sort((a, b) => {
          const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
          const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
          if (distA !== distB) return distA - distB;
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
      }

      const total = deliverableItems.length;
      const paged = deliverableItems.slice(skip, skip + query.pageSize);
      return sendOk(res, paged, 200, {
        page: query.page,
        pageSize: query.pageSize,
        total,
        radiusFiltered: true
      });
    }

    const [items, total] = await Promise.all([
      prisma.storeProduct.findMany({
        where,
        include,
        orderBy,
        skip,
        take: query.pageSize
      }),
      prisma.storeProduct.count({ where })
    ]);

    const formatted = items.map((item) => {
      const range = evaluateProductDeliveryRange({
        productRadiusKm: item.deliveryRadiusKm,
        storeRadiusKm: item.store.serviceRadiusKm
      });
      return {
        ...formatStoreProduct(item),
        deliveryRadiusKm: range.deliveryRadiusKm,
        distanceKm: range.distanceKm,
        isDeliverable: true
      };
    });

    return sendOk(res, formatted, 200, { page: query.page, pageSize: query.pageSize, total });
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:id", async (req, res, next) => {
  try {
    const item = await prisma.storeProduct.findFirst({
      where: {
        id: req.params.id,
        isActive: true,
        store: { isActive: true, sellerProfile: { verificationStatus: "APPROVED" } }
      },
      include: {
        product: {
          include: {
            category: true,
            images: {
              select: {
                id: true,
                productId: true,
                url: true,
                altText: true,
                sortOrder: true
              }
            }
          }
        },
        store: true
      }
    });
    if (!item) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product listing not found");

    const customerLat = parseCoordinate(req.query.latitude);
    const customerLng = parseCoordinate(req.query.longitude);
    const customerCity = typeof req.query.city === "string" ? req.query.city : undefined;
    const range = evaluateProductDeliveryRange({
      customerLat,
      customerLng,
      customerCity,
      storeLat: item.store.latitude,
      storeLng: item.store.longitude,
      storeCity: item.store.city,
      productRadiusKm: item.deliveryRadiusKm,
      storeRadiusKm: item.store.serviceRadiusKm
    });

    return sendOk(res, {
      ...formatStoreProduct(item),
      deliveryRadiusKm: range.deliveryRadiusKm,
      distanceKm: range.distanceKm,
      isDeliverable: range.isDeliverable
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/products/:id/reviews
 * Returns genuine customer ratings and reviews for a product from verified delivered orders
 */
productsRouter.get("/:id/reviews", async (req, res, next) => {
  try {
    const targetId = req.params.id;

    // Look up product listing details if exists
    let productListing: any = null;
    try {
      productListing = await prisma.storeProduct.findFirst({
        where: { id: targetId },
        include: { product: true, store: true }
      });
    } catch {}

    const targetNameLower = productListing?.product?.name?.toLowerCase();
    const targetStoreId = productListing?.storeId;

    const genuineReviews: Array<{
      id: string;
      orderNumber: string;
      author: string;
      rating: number;
      date: string;
      site: string;
      comment: string;
      verified: boolean;
    }> = [];

    const seenOrderIds = new Set<string>();

    // 1. Fetch real customer reviews from delivered orders in file/memory store
    const fileOrders = loadOrders();
    for (const ord of fileOrders) {
      if (ord && ord.status === "DELIVERED" && ord.review && ord.review.rating) {
        const matchesProduct = (ord.items || []).some((it: any) => {
          if (!it) return false;
          if (it.storeProductId && it.storeProductId === targetId) return true;
          if (it.id && it.id === targetId) return true;
          if (targetNameLower && it.productName && it.productName.toLowerCase().includes(targetNameLower)) return true;
          return false;
        });

        const matchesStore = targetStoreId && ord.storeId === targetStoreId;

        // If matches this specific product, or matches this fulfilling store's delivered orders
        if (matchesProduct || matchesStore) {
          const ordKey = ord.id || ord.orderNumber;
          if (!seenOrderIds.has(ordKey)) {
            seenOrderIds.add(ordKey);
            const reviewDate = ord.review.createdAt
              ? new Date(ord.review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "Recently";
            const site = ord.deliveryAddress
              ? `${ord.deliveryAddress.city || "Site"}${ord.deliveryAddress.state ? `, ${ord.deliveryAddress.state}` : ""}`
              : "Project Site";

            genuineReviews.push({
              id: `rev-${ordKey}`,
              orderNumber: ord.orderNumber || ord.id,
              author: ord.customerName || "Verified Project Buyer",
              rating: Number(ord.review.rating),
              date: reviewDate,
              site,
              comment: ord.review.comment || "Order delivered and verified at site.",
              verified: true
            });
          }
        }
      }
    }

    // 2. Fetch real reviews from Prisma DB if connected
    try {
      const dbReviews = await prisma.review.findMany({
        where: {
          isApproved: true,
          order: {
            OR: [
              { items: { some: { storeProductId: targetId } } },
              ...(targetStoreId ? [{ storeId: targetStoreId }] : [])
            ]
          }
        },
        include: {
          user: { select: { name: true } },
          order: { include: { address: true, items: true } }
        },
        orderBy: { createdAt: "desc" }
      });

      for (const dbr of dbReviews) {
        if (!seenOrderIds.has(dbr.orderId)) {
          seenOrderIds.add(dbr.orderId);
          const reviewDate = dbr.createdAt
            ? new Date(dbr.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "Recently";
          const site = dbr.order.address
            ? `${dbr.order.address.city}, ${dbr.order.address.state}`
            : "Project Site";

          genuineReviews.push({
            id: dbr.id,
            orderNumber: dbr.orderId,
            author: dbr.user?.name || "Verified Project Buyer",
            rating: dbr.rating,
            date: reviewDate,
            site,
            comment: dbr.comment || "Genuine materials delivered at site.",
            verified: true
          });
        }
      }
    } catch {}

    const totalCount = genuineReviews.length;
    const avgRating = totalCount > 0
      ? Number((genuineReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1))
      : null;

    return sendOk(res, {
      rating: avgRating,
      reviewsCount: totalCount,
      reviews: genuineReviews
    });
  } catch (error) {
    next(error);
  }
});
