import { Router } from "express";
import {
  driverEndTripSchema,
  driverLocationSnapshotSchema,
  generateTrackingLinkSchema
} from "@etukas/shared";
import { Role } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { HttpError, sendOk } from "../../utils/http.js";
import {
  canPartnerManageOrder,
  canUserAccessOrder,
  findOrderById
} from "../orders/orders.routes.js";
import {
  endDriverTrip,
  generateTrackingLink,
  getDriverTripSession,
  getOrderTrackingSessionForViewer,
  saveDriverLocationSnapshot
} from "./tracking.service.js";

/**
 * Public driver routes — authenticated solely by cryptographically secure trip token.
 * Mounted at /api/v1/driver (and aliased at /api/driver).
 */
export const driverRouter = Router();

/**
 * GET /api/v1/driver/session/:token
 * Validates the driver's trip token and returns store + customer coordinates & last known truck location.
 * Returns 410 Gone if the order is already delivered or the token expired/inactive.
 */
driverRouter.get("/session/:token", async (req, res, next) => {
  try {
    const sessionInfo = await getDriverTripSession(req.params.token);
    return sendOk(res, sessionInfo);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/driver/location-snapshot
 * Persists the driver's latest GPS coordinates onto the Order record as a durable fallback.
 */
driverRouter.post("/location-snapshot", async (req, res, next) => {
  try {
    const input = driverLocationSnapshotSchema.parse(req.body);
    const result = await saveDriverLocationSnapshot(input);
    return sendOk(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/driver/end-trip
 * Marks the driver's tracking session inactive when the driver taps "End Trip".
 */
driverRouter.post("/end-trip", async (req, res, next) => {
  try {
    const input = driverEndTripSchema.parse(req.body);
    const result = await endDriverTrip(input.token);
    return sendOk(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * Authenticated order tracking endpoints:
 * - POST /api/v1/orders/:orderId/tracking-link (Seller / Manufacturer / Admin)
 * - GET  /api/v1/orders/:orderId/tracking-session (Authorized Customer / Seller / Admin)
 */
export const orderTrackingRouter = Router();
orderTrackingRouter.use(requireAuth);

orderTrackingRouter.post(
  "/:orderId/tracking-link",
  requireRole(Role.SELLER, Role.MANUFACTURER, Role.ADMIN),
  async (req, res, next) => {
    try {
      const order = await findOrderById(req.params.orderId);
      if (!order) {
        throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
      }

      const isAdmin = req.user!.roles.includes(Role.ADMIN);
      if (!isAdmin) {
        const canManage = await canPartnerManageOrder(order, req.user!);
        if (!canManage) {
          throw new HttpError(
            403,
            "FORBIDDEN",
            "You do not have permission to generate a tracking link for this order"
          );
        }
      }

      const input = generateTrackingLinkSchema.parse(req.body ?? {});
      const originHeader = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
      const result = await generateTrackingLink(order, {
        clientOrigin: input.clientOrigin || originHeader,
        expiresInHours: input.expiresInHours
      });
      return sendOk(res, result);
    } catch (error) {
      next(error);
    }
  }
);

orderTrackingRouter.get("/:orderId/tracking-session", async (req, res, next) => {
  try {
    const order = await findOrderById(req.params.orderId);
    if (!order) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    const allowed = await canUserAccessOrder(order, req.user!);
    if (!allowed) {
      throw new HttpError(403, "FORBIDDEN", "You do not have permission to view live tracking for this order");
    }

    const sessionInfo = await getOrderTrackingSessionForViewer(order);
    return sendOk(res, sessionInfo);
  } catch (error) {
    next(error);
  }
});
