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
  quantity: z.coerce.number().int().positive().max(1_000_000)
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive().max(1_000_000)
});

export const deliveryAddressSchema = z.object({
  contactName: z.string().trim().min(2).max(120),
  mobile: z.string().trim().min(10).max(15),
  line1: z.string().trim().min(3).max(250),
  line2: z.string().trim().max(250).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(4).max(12),
  landmark: z.string().trim().max(150).optional(),
  label: z.string().trim().max(50).default("Home")
});

export const checkoutItemSchema = z.object({
  storeProductId: z.string().optional(),
  productId: z.string().optional(),
  productName: z.string().trim().min(1).max(200),
  unit: z.string().trim().default("piece"),
  quantity: z.coerce.number().int().positive(),
  priceMinor: z.coerce.number().int().positive(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  storeId: z.string().optional(),
  storeName: z.string().optional()
});

export const checkoutSchema = z.object({
  addressId: z.string().optional(),
  deliveryAddress: deliveryAddressSchema.optional(),
  paymentMethod: z.enum(["COD", "MOCK_ONLINE", "UPI", "CARD", "NET_BANKING", "EMI"]).default("COD"),
  items: z.array(checkoutItemSchema).optional(),
  gstin: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(500).optional()
});

export const orderTrackingUpdateSchema = z.object({
  status: z.enum([
    "PLACED",
    "CONFIRMED",
    "ACCEPTED",
    "LOADING_VEHICLE",
    "PREPARING",
    "ASSIGNED_DRIVER",
    "DISPATCHED",
    "DELIVERED",
    "REJECTED",
    "CANCELLED"
  ]),
  vehicleNumber: z.string().trim().max(50).optional(),
  driverName: z.string().trim().max(100).optional(),
  driverPhone: z.string().trim().max(20).optional(),
  rejectionReason: z.string().trim().max(300).optional(),
  note: z.string().trim().max(300).optional()
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type DeliveryAddressInput = z.infer<typeof deliveryAddressSchema>;
export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type OrderTrackingUpdateInput = z.infer<typeof orderTrackingUpdateSchema>;

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
