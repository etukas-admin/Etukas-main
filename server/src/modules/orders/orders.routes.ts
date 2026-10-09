import { randomUUID } from "node:crypto";
import { Router } from "express";
import { checkoutSchema } from "@etukas/shared";
import { OrderStatus, PaymentProvider, PaymentStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";
import { lineTotals } from "../../utils/money.js";

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

ordersRouter.post("/", async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body);
    const parentCheckoutId = randomUUID();
    const orders = await prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({ where: { id: input.addressId, userId: req.user!.id } });
      if (!address) throw new HttpError(404, "ADDRESS_NOT_FOUND", "Delivery address not found");
      const cart = await tx.cart.findUnique({
        where: { userId: req.user!.id },
        include: { items: { include: { storeProduct: { include: { product: true } } } } }
      });
      if (!cart || cart.items.length === 0) throw new HttpError(400, "EMPTY_CART", "Cart is empty");

      const byStore = new Map<string, typeof cart.items>();
      for (const item of cart.items) {
        if (!item.storeProduct.isActive || item.quantity > item.storeProduct.stockQuantity) {
          throw new HttpError(409, "STOCK_UNAVAILABLE", `${item.storeProduct.product.name} is no longer available in requested quantity`);
        }
        byStore.set(item.storeProduct.storeId, [...(byStore.get(item.storeProduct.storeId) ?? []), item]);
      }

      const created = [];
      for (const [storeId, items] of byStore) {
        let subtotalMinor = 0;
        let taxMinor = 0;
        let discountMinor = 0;
        let totalMinor = 0;
        const orderItems = [];

        for (const item of items) {
          const updated = await tx.storeProduct.updateMany({
            where: { id: item.storeProductId, stockQuantity: { gte: item.quantity } },
            data: { stockQuantity: { decrement: item.quantity } }
          });
          if (updated.count !== 1) throw new HttpError(409, "STOCK_UNAVAILABLE", `${item.storeProduct.product.name} stock changed. Please review cart.`);
          const totals = lineTotals(item.storeProduct.priceMinor, item.quantity, item.storeProduct.taxRateBps, item.storeProduct.discountMinor);
          subtotalMinor += totals.subtotalMinor;
          taxMinor += totals.taxMinor;
          discountMinor += totals.discountMinor;
          totalMinor += totals.totalMinor;
          orderItems.push({
            storeProductId: item.storeProductId,
            productName: item.storeProduct.product.name,
            sku: item.storeProduct.sku,
            unit: item.storeProduct.product.unit,
            quantity: item.quantity,
            priceMinorSnapshot: item.storeProduct.priceMinor,
            taxMinorSnapshot: totals.taxMinor,
            discountMinorSnapshot: totals.discountMinor,
            totalMinorSnapshot: totals.totalMinor
          });
          await tx.inventoryMovement.create({ data: { storeProductId: item.storeProductId, type: "RESERVE", quantity: item.quantity, reason: `Checkout ${parentCheckoutId}` } });
        }

        const deliveryChargeMinor = totalMinor > 500000 ? 0 : 25000;
        const order = await tx.order.create({
          data: {
            parentCheckoutId,
            customerId: req.user!.id,
            storeId,
            addressId: address.id,
            status: input.paymentMethod === "COD" ? OrderStatus.PLACED : OrderStatus.PENDING_PAYMENT,
            subtotalMinor,
            taxMinor,
            discountMinor,
            deliveryChargeMinor,
            totalMinor: totalMinor + deliveryChargeMinor,
            items: { create: orderItems }
          },
          include: { items: true, store: true }
        });
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: input.paymentMethod === "COD" ? PaymentProvider.COD : PaymentProvider.MOCK,
            status: input.paymentMethod === "COD" ? PaymentStatus.PENDING : PaymentStatus.AUTHORIZED,
            amountMinor: order.totalMinor,
            idempotencyKey: `${parentCheckoutId}:${order.id}`
          }
        });
        created.push(order);
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });
    return sendCreated(res, { parentCheckoutId, orders });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.user!.id },
      include: { store: true, items: true, payment: true },
      orderBy: { createdAt: "desc" }
    });
    return sendOk(res, orders);
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, customerId: req.user!.id },
      include: { store: true, items: true, payment: true, address: true }
    });
    if (!order) throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    return sendOk(res, order);
  } catch (error) {
    next(error);
  }
});
