import { Router } from "express";
import { Role, VerificationStatus } from "@prisma/client";
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
    const sellers = await prisma.sellerProfile.findMany({ include: { user: { select: { name: true, email: true, mobile: true } }, stores: true }, orderBy: { createdAt: "desc" } });
    return sendOk(res, sellers);
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
    const status = req.body.status as VerificationStatus;
    if (!Object.values(VerificationStatus).includes(status)) throw new HttpError(400, "INVALID_STATUS", "Invalid verification status");
    const seller = await prisma.sellerProfile.update({ where: { id: req.params.id }, data: { verificationStatus: status, rejectionReason: req.body.rejectionReason } });
    await prisma.auditLog.create({ data: { actorId: req.user!.id, action: "SELLER_STATUS_UPDATED", target: seller.id, metadata: { status } } });
    return sendOk(res, seller);
  } catch (error) {
    next(error);
  }
});
