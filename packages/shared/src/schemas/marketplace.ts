import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12)
});

export const productQuerySchema = paginationSchema.extend({
  q: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sort: z.enum(["relevance", "price_asc", "price_desc", "newest"]).default("relevance"),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional()
});

export const addCartItemSchema = z.object({
  storeProductId: z.string().cuid(),
  quantity: z.coerce.number().int().positive().max(9999)
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive().max(9999)
});

export const checkoutSchema = z.object({
  addressId: z.string().cuid(),
  paymentMethod: z.enum(["COD", "MOCK_ONLINE"])
});

export const sellerProductSchema = z.object({
  productId: z.string().cuid(),
  storeId: z.string().cuid(),
  sku: z.string().min(2).max(80),
  priceMinor: z.coerce.number().int().positive(),
  taxRateBps: z.coerce.number().int().min(0).max(2800).default(1800),
  stockQuantity: z.coerce.number().int().min(0),
  minOrderQuantity: z.coerce.number().int().positive().default(1),
  isActive: z.boolean().default(false)
});
