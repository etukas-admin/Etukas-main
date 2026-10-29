import { Router } from "express";
import { productQuerySchema } from "@etukas/shared";
import { prisma } from "../../config/prisma.js";
import { HttpError, sendOk } from "../../utils/http.js";

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
    const where = {
      isActive: true,
      store: {
        isActive: true,
        sellerProfile: { verificationStatus: "APPROVED" as const }
      },
      product: {
        category: query.category ? { slug: query.category } : undefined,
        OR: query.q
          ? [
              { name: { contains: query.q, mode: "insensitive" as const } },
              { description: { contains: query.q, mode: "insensitive" as const } }
            ]
          : undefined
      }
    };
    const orderBy = query.sort === "price_asc" ? { priceMinor: "asc" as const } : query.sort === "price_desc" ? { priceMinor: "desc" as const } : { updatedAt: "desc" as const };
    const [items, total] = await Promise.all([
      prisma.storeProduct.findMany({
        where,
        include: { product: { include: { category: true, images: true } }, store: true },
        orderBy,
        skip,
        take: query.pageSize
      }),
      prisma.storeProduct.count({ where })
    ]);
    return sendOk(res, items.map(formatStoreProduct), 200, { page: query.page, pageSize: query.pageSize, total });
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
      include: { product: { include: { category: true, images: true } }, store: true }
    });
    if (!item) throw new HttpError(404, "PRODUCT_NOT_FOUND", "Product listing not found");
    return sendOk(res, formatStoreProduct(item));
  } catch (error) {
    next(error);
  }
});
