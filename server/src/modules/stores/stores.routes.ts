import { Router } from "express";
import { prisma } from "../../config/prisma.js";
import { calculateDistanceKm, isMissingColumnError, parseCoordinate } from "../../utils/geo.js";
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
    const city = typeof req.query.city === "string" && req.query.city.trim() !== "" ? req.query.city.trim() : undefined;
    const customerLat = parseCoordinate(req.query.latitude);
    const customerLng = parseCoordinate(req.query.longitude);

    if (customerLat !== null && customerLng !== null) {
      let allStores: any[];
      try {
        allStores = await prisma.store.findMany({
          where: { isActive: true, sellerProfile: { verificationStatus: "APPROVED" } },
          include: {
            sellerProfile: { select: { businessName: true, verificationStatus: true } },
            storeProducts: { where: { isActive: true }, select: { deliveryRadiusKm: true } }
          }
        });
      } catch (err) {
        if (!isMissingColumnError(err, "deliveryRadiusKm")) throw err;
        allStores = await prisma.store.findMany({
          where: { isActive: true, sellerProfile: { verificationStatus: "APPROVED" } },
          include: {
            sellerProfile: { select: { businessName: true, verificationStatus: true } }
          }
        });
      }

      const nearby = allStores
        .map(({ storeProducts, ...store }) => {
          const sLat = parseCoordinate(store.latitude);
          const sLng = parseCoordinate(store.longitude);
          // Effective store reach is the max of its serviceRadiusKm and any active product's deliveryRadiusKm
          const maxProductRadius = Array.isArray(storeProducts)
            ? storeProducts.reduce((max: number, sp: { deliveryRadiusKm?: number | null }) => Math.max(max, sp.deliveryRadiusKm ?? 0), 0)
            : 0;
          const effectiveRadiusKm = Math.max(store.serviceRadiusKm ?? 25, maxProductRadius);

          if (sLat !== null && sLng !== null) {
            const distanceKm = calculateDistanceKm(customerLat, customerLng, sLat, sLng);
            return {
              ...store,
              serviceRadiusKm: effectiveRadiusKm,
              distanceKm,
              inRange: distanceKm <= effectiveRadiusKm
            };
          }

          const cityMatches = Boolean(
            city && store.city.toLowerCase().includes(city.toLowerCase())
          );
          return {
            ...store,
            serviceRadiusKm: effectiveRadiusKm,
            distanceKm: null as number | null,
            inRange: cityMatches
          };
        })
        .filter((s) => s.inRange)
        .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY))
        .slice(0, 12)
        .map(({ inRange: _inRange, ...rest }) => rest);

      return sendOk(res, nearby, 200, { provider: "geo", city: city || "Nearby" });
    }

    let stores = city
      ? await prisma.store.findMany({
          where: { isActive: true, city: { contains: city, mode: "insensitive" }, sellerProfile: { verificationStatus: "APPROVED" } },
          include: { sellerProfile: { select: { businessName: true, verificationStatus: true } } },
          take: 12
        })
      : [];

    if (stores.length === 0) {
      stores = await prisma.store.findMany({
        where: { isActive: true, sellerProfile: { verificationStatus: "APPROVED" } },
        include: { sellerProfile: { select: { businessName: true, verificationStatus: true } } },
        take: 12
      });
    }
    return sendOk(res, stores, 200, { provider: "manual", city: city || "All" });
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
