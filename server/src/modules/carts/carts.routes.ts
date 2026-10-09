import { Router } from "express";
import { addCartItemSchema, updateCartItemSchema } from "@etukas/shared";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";
import { lineTotals } from "../../utils/money.js";

export const cartsRouter = Router();
cartsRouter.use(requireAuth);

async function getCart(userId: string) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
    include: {
      items: {
        include: {
          storeProduct: {
            include: { product: { include: { images: true } }, store: true }
          }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

function summarizeCart(cart: Awaited<ReturnType<typeof getCart>>) {
  const totals = cart.items.reduce(
    (sum, item) => {
      const line = lineTotals(item.storeProduct.priceMinor, item.quantity, item.storeProduct.taxRateBps, item.storeProduct.discountMinor);
      return {
        subtotalMinor: sum.subtotalMinor + line.subtotalMinor,
        taxMinor: sum.taxMinor + line.taxMinor,
        discountMinor: sum.discountMinor + line.discountMinor,
        totalMinor: sum.totalMinor + line.totalMinor
      };
    },
    { subtotalMinor: 0, taxMinor: 0, discountMinor: 0, totalMinor: 0 }
  );
  return { ...cart, totals };
}

cartsRouter.get("/", async (req, res, next) => {
  try {
    return sendOk(res, summarizeCart(await getCart(req.user!.id)));
  } catch (error) {
    next(error);
  }
});

cartsRouter.post("/items", async (req, res, next) => {
  try {
    const input = addCartItemSchema.parse(req.body);
    const listing = await prisma.storeProduct.findUnique({ where: { id: input.storeProductId } });
    if (!listing?.isActive) throw new HttpError(404, "LISTING_NOT_AVAILABLE", "Product listing is not available");
    if (input.quantity < listing.minOrderQuantity) throw new HttpError(400, "MIN_ORDER_QUANTITY", `Minimum order quantity is ${listing.minOrderQuantity}`);
    const cart = await prisma.cart.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } });
    const item = await prisma.cartItem.upsert({
      where: { cartId_storeProductId: { cartId: cart.id, storeProductId: input.storeProductId } },
      update: { quantity: { increment: input.quantity } },
      create: { cartId: cart.id, storeProductId: input.storeProductId, quantity: input.quantity }
    });
    return sendCreated(res, item);
  } catch (error) {
    next(error);
  }
});

cartsRouter.patch("/items/:id", async (req, res, next) => {
  try {
    const input = updateCartItemSchema.parse(req.body);
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.id, cart: { userId: req.user!.id } }, include: { storeProduct: true } });
    if (!item) throw new HttpError(404, "CART_ITEM_NOT_FOUND", "Cart item not found");
    if (input.quantity < item.storeProduct.minOrderQuantity) throw new HttpError(400, "MIN_ORDER_QUANTITY", `Minimum order quantity is ${item.storeProduct.minOrderQuantity}`);
    return sendOk(res, await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: input.quantity } }));
  } catch (error) {
    next(error);
  }
});

cartsRouter.delete("/items/:id", async (req, res, next) => {
  try {
    const item = await prisma.cartItem.findFirst({ where: { id: req.params.id, cart: { userId: req.user!.id } } });
    if (!item) throw new HttpError(404, "CART_ITEM_NOT_FOUND", "Cart item not found");
    await prisma.cartItem.delete({ where: { id: item.id } });
    return sendOk(res, { deleted: true });
  } catch (error) {
    next(error);
  }
});
