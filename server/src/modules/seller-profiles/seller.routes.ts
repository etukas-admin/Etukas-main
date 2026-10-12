import { Router } from "express";
import { sellerProductSchema } from "@etukas/shared";
import { OrderStatus, Role, VerificationStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";

export const sellerRouter = Router();
sellerRouter.use(requireAuth, requireRole(Role.SELLER, Role.MANUFACTURER));

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
    const input = sellerProductSchema.parse(req.body);
    const profile = await sellerProfile(req.user!.id);
    if (profile.verificationStatus !== VerificationStatus.APPROVED && input.isActive) {
      throw new HttpError(403, "SELLER_NOT_APPROVED", "Only approved sellers can publish active listings");
    }
    const store = await prisma.store.findFirst({ where: { id: input.storeId, sellerProfileId: profile.id } });
    if (!store) throw new HttpError(404, "STORE_NOT_FOUND", "Store not found");
    const listing = await prisma.storeProduct.create({ data: input });
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
    const updated = await prisma.storeProduct.update({
      where: { id: listing.id },
      data: {
        priceMinor: req.body.priceMinor,
        stockQuantity: req.body.stockQuantity,
        minOrderQuantity: req.body.minOrderQuantity,
        isActive: req.body.isActive
      }
    });
    return sendOk(res, updated);
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
