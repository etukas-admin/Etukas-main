import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { HttpError, sendOk } from "../../utils/http.js";

export const storesRouter = Router();

storesRouter.get("/", async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      where: { isActive: true, sellerProfile: { verificationStatus: "APPROVED" } },
      include: {
        sellerProfile: { select: { businessName: true, verificationStatus: true } },
        storeProducts: { where: { isActive: true }, take: 3, include: { product: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return sendOk(res, stores);
  } catch (error) {
    next(error);
  }
});

storesRouter.get("/nearby", async (req, res, next) => {
  try {
    const city = typeof req.query.city === "string" ? req.query.city : "Hyderabad";
    const stores = await prisma.store.findMany({
      where: { isActive: true, city: { contains: city, mode: "insensitive" }, sellerProfile: { verificationStatus: "APPROVED" } },
      include: { sellerProfile: { select: { businessName: true, verificationStatus: true } } },
      take: 12
    });
    return sendOk(res, stores, 200, { provider: "manual", city });
  } catch (error) {
    next(error);
  }
});

storesRouter.get("/:id", async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({
      where: { id: req.params.id },
      include: {
        sellerProfile: { select: { businessName: true, verificationStatus: true } },
        storeProducts: {
          where: { isActive: true },
          include: { product: { include: { images: true } } }
        }
      }
    });
    if (!store) throw new HttpError(404, "STORE_NOT_FOUND", "Store not found");
    return sendOk(res, store);
  } catch (error) {
    next(error);
  }
});
