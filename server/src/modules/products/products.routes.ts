import { Router } from "express";
import { productQuerySchema } from "@etukas/shared";
import { prisma } from "../../config/prisma.js";
import { HttpError, sendOk } from "../../utils/http.js";

export const productsRouter = Router();

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
    return sendOk(res, items, 200, { page: query.page, pageSize: query.pageSize, total });
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
    return sendOk(res, item);
  } catch (error) {
    next(error);
  }
});
