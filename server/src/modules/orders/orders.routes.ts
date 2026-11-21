import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  checkoutSchema,
  orderTrackingUpdateSchema,
  orderReviewSchema,
  type CheckoutInput,
  type OrderTrackingUpdateInput
} from "@etukas/shared";
import { AdminNotificationType, OrderStatus, Role } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { requireAuth, requireRole, type AuthUser } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ordersRouter = Router();

// ---------- Types & Data Structures ----------

export type DeliveryStatus =
  | "PLACED"
  | "CONFIRMED"
  | "LOADING_VEHICLE"
  | "ASSIGNED_DRIVER"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

export interface OrderItemRecord {
  id: string;
  storeProductId?: string;
  productName: string;
  sku?: string;
  unit: string;
  quantity: number;
  priceMinor: number;
  taxMinor?: number;
  discountMinor?: number;
  totalMinor: number;
  imageUrl?: string;
  category?: string;
}

export interface OrderRecord {
  id: string;
  orderNumber: string; // e.g. ETORD839120
  parentCheckoutId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  storeId: string;
  storeName: string;
  sellerId?: string; // Partner ID
  sellerPhone?: string;
  addressId?: string;
  deliveryAddress: {
    contactName: string;
    mobile: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    landmark?: string;
    label?: string;
  };
  status: DeliveryStatus;
  subtotalMinor: number;
  taxMinor: number;
  discountMinor: number;
  deliveryChargeMinor: number;
  protectFeeMinor: number;
  totalMinor: number;
  currency: string;
  paymentMethod: "COD" | "MOCK_ONLINE" | "UPI" | "CARD" | "NET_BANKING" | "EMI";
  paymentStatus: "PENDING" | "PAID";
  items: OrderItemRecord[];
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  rejectionReason?: string;
  deliveryOtp?: string;
  estimatedDeliveryDate?: string;
  gstin?: string;
  notes?: string;
  statusNote?: string;
  review?: {
    rating: number;
    comment?: string;
    createdAt: string;
  };
  statusHistory: Array<{
    status: DeliveryStatus;
    timestamp: string;
    note?: string;
    actor?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

const DELIVERY_STAGE_RANK: Record<DeliveryStatus, number> = {
  PLACED: 0,
  CONFIRMED: 1,
  LOADING_VEHICLE: 2,
  ASSIGNED_DRIVER: 3,
  DELIVERED: 4,
  REJECTED: -1,
  CANCELLED: -1
};

const TERMINAL_STATUSES = new Set<DeliveryStatus>(["DELIVERED", "REJECTED", "CANCELLED"]);

// ---------- Helper Functions & Storage ----------

export function generateOrderId(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
  return `ETORD${randomDigits}`;
}

// Resolve consistently relative to server/data (not process.cwd())
const ORDERS_FILE_PATH = path.resolve(__dirname, "../../../data/orders.json");

const SEED_ORDERS: OrderRecord[] = [
  {
    id: "ETORD948123",
    orderNumber: "ETORD948123",
    parentCheckoutId: "CHK-INIT-001",
    customerId: "cust-demo-1",
    customerName: "Kavitha Constructions",
    customerPhone: "9848022334",
    customerEmail: "kavitha.constructions@gmail.com",
    storeId: "store-kakinada-1",
    storeName: "Sri Lakshmi Building Materials",
    sellerId: "SELLER-10247",
    sellerPhone: "9848123456",
    deliveryAddress: {
      contactName: "Kavitha Constructions",
      mobile: "9848022334",
      line1: "Plot 42, Gachibowli Site #4, Financial District",
      line2: "Near Bio-Diversity Park",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500032",
      landmark: "Near Bio-Diversity Park",
      label: "Construction Site"
    },
    status: "CONFIRMED",
    subtotalMinor: 16850000,
    taxMinor: 0,
    discountMinor: 0,
    deliveryChargeMinor: 0,
    protectFeeMinor: 0,
    totalMinor: 16850000,
    currency: "INR",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    items: [
      {
        id: "item-1",
        productName: "UltraTech Super Cement (Grade 53 PPC)",
        unit: "bag",
        quantity: 100,
        priceMinor: 38500,
        totalMinor: 3850000,
        imageUrl: "/images/pngimages/cement.webp",
        category: "Cement"
      },
      {
        id: "item-2",
        productName: "Tata Tiscon 500D TMT Steel Rebars (12mm)",
        unit: "tonne",
        quantity: 2,
        priceMinor: 6500000,
        totalMinor: 13000000,
        imageUrl: "/images/pngimages/steel-iron-bars.webp",
        category: "Steel & Iron"
      }
    ],
    vehicleNumber: "AP 05 TX 4589",
    driverName: "S. Appa Rao",
    driverPhone: "9848999888",
    statusHistory: [
      { status: "PLACED", timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), note: "Order placed via Cash on Delivery" },
      { status: "CONFIRMED", timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), note: "Order accepted by Sri Lakshmi Building Materials" }
    ],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "ETORD947712",
    orderNumber: "ETORD947712",
    parentCheckoutId: "CHK-INIT-002",
    customerId: "cust-demo-2",
    customerName: "Sri Krishna Developers",
    customerPhone: "9848133445",
    customerEmail: "srikrishna.dev@gmail.com",
    storeId: "store-kakinada-1",
    storeName: "Sri Lakshmi Building Materials",
    sellerId: "SELLER-10247",
    sellerPhone: "9848123456",
    deliveryAddress: {
      contactName: "G. V. R. Prasad",
      mobile: "9848133445",
      line1: "Phase 2, Kukatpally Housing Board Colony",
      city: "Hyderabad",
      state: "Telangana",
      postalCode: "500072",
      label: "Site #2"
    },
    status: "DELIVERED",
    subtotalMinor: 1600000,
    taxMinor: 0,
    discountMinor: 0,
    deliveryChargeMinor: 0,
    protectFeeMinor: 0,
    totalMinor: 1600000,
    currency: "INR",
    paymentMethod: "COD",
    paymentStatus: "PAID",
    items: [
      {
        id: "item-3",
        productName: "River Sand (Washed & Screened)",
        unit: "brass",
        quantity: 2,
        priceMinor: 550000,
        totalMinor: 1100000,
        imageUrl: "/images/pngimages/sand.webp",
        category: "Sand"
      },
      {
        id: "item-4",
        productName: "20mm Blue Metal Granite Aggregates",
        unit: "brass",
        quantity: 2,
        priceMinor: 250000,
        totalMinor: 500000,
        imageUrl: "/images/pngimages/stone-aggregates.webp",
        category: "Stones"
      }
    ],
    vehicleNumber: "TS 08 UB 7712",
    driverName: "M. Nageswara Rao",
    driverPhone: "9848777666",
    review: {
      rating: 5,
      comment: "Prompt vehicle dispatch directly to our construction site. Fresh batch without any impurities, and the driver helped coordinate offloading.",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    statusHistory: [
      { status: "PLACED", timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), note: "Order placed" },
      { status: "CONFIRMED", timestamp: new Date(Date.now() - 86400000 * 2 + 3600000).toISOString(), note: "Confirmed by seller" },
      { status: "LOADING_VEHICLE", timestamp: new Date(Date.now() - 86400000 * 2 + 7200000).toISOString(), note: "Loaded on tipper truck TS 08 UB 7712" },
      { status: "ASSIGNED_DRIVER", timestamp: new Date(Date.now() - 86400000 * 2 + 10800000).toISOString(), note: "Driver M. Nageswara Rao assigned for delivery" },
      { status: "DELIVERED", timestamp: new Date(Date.now() - 86400000).toISOString(), note: "Delivered at site and paid via Cash on Delivery" }
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// Offline / local fallback memory store
const ordersMemoryStore = new Map<string, OrderRecord>();

function initOrdersStore(): void {
  try {
    if (fs.existsSync(ORDERS_FILE_PATH)) {
      const raw = fs.readFileSync(ORDERS_FILE_PATH, "utf8");
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        for (const ord of list) {
          ordersMemoryStore.set(ord.id, ord);
          if (ord.orderNumber) ordersMemoryStore.set(ord.orderNumber, ord);
        }
        return;
      }
    }
  } catch (err) {
    console.warn("Failed to read orders.json:", err);
  }

  for (const ord of SEED_ORDERS) {
    ordersMemoryStore.set(ord.id, ord);
    if (ord.orderNumber) ordersMemoryStore.set(ord.orderNumber, ord);
  }
  persistOrdersToDisk();
}

function persistOrdersToDisk(): void {
  if (process.env.VITEST) return;
  try {
    const uniqueOrders = Array.from(new Set(ordersMemoryStore.values()));
    const dir = path.dirname(ORDERS_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ORDERS_FILE_PATH, JSON.stringify(uniqueOrders, null, 2), "utf8");
  } catch {
    // Expected on read-only serverless filesystems (e.g., Vercel); PostgreSQL is primary store
  }
}

initOrdersStore();

export function loadOrders(): OrderRecord[] {
  return Array.from(new Set(ordersMemoryStore.values()));
}

export function saveOrders(orders: OrderRecord[]): void {
  for (const ord of orders) {
    ordersMemoryStore.set(ord.id, ord);
    if (ord.orderNumber) ordersMemoryStore.set(ord.orderNumber, ord);
  }
  persistOrdersToDisk();
}

export function saveOrder(order: OrderRecord): void {
  ordersMemoryStore.set(order.id, order);
  if (order.orderNumber) ordersMemoryStore.set(order.orderNumber, order);
  persistOrdersToDisk();
}

export function normalizeDeliveryStatus(st: string): DeliveryStatus {
  if (st === "ACCEPTED" || st === "CONFIRMED") return "CONFIRMED";
  if (st === "PREPARING" || st === "LOADING_VEHICLE") return "LOADING_VEHICLE";
  if (st === "DISPATCHED" || st === "ASSIGNED_DRIVER") return "ASSIGNED_DRIVER";
  if (st === "DELIVERED") return "DELIVERED";
  if (st === "REJECTED") return "REJECTED";
  if (st === "CANCELLED") return "CANCELLED";
  return "PLACED";
}

export function toPrismaOrderStatus(st: string): OrderStatus {
  if (st === "CONFIRMED" || st === "ACCEPTED") return OrderStatus.ACCEPTED;
  if (st === "LOADING_VEHICLE" || st === "PREPARING") return OrderStatus.PREPARING;
  if (st === "ASSIGNED_DRIVER" || st === "DISPATCHED") return OrderStatus.DISPATCHED;
  if (st === "DELIVERED") return OrderStatus.DELIVERED;
  if (st === "REJECTED") return OrderStatus.REJECTED;
  if (st === "CANCELLED") return OrderStatus.CANCELLED;
  return OrderStatus.PLACED;
}

export function buildTrackingMetadata(order: OrderRecord) {
  return {
    orderNumber: order.orderNumber,
    sellerId: order.sellerId,
    sellerPhone: order.sellerPhone,
    storeName: order.storeName,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    deliveryAddress: order.deliveryAddress,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    protectFeeMinor: order.protectFeeMinor,
    vehicleNumber: order.vehicleNumber,
    driverName: order.driverName,
    driverPhone: order.driverPhone,
    rejectionReason: order.rejectionReason,
    deliveryOtp: order.deliveryOtp,
    estimatedDeliveryDate: order.estimatedDeliveryDate,
    gstin: order.gstin,
    notes: order.notes,
    statusNote: order.statusNote,
    review: order.review,
    statusHistory: order.statusHistory,
    items: order.items
  };
}

export function mapDbOrderToRecord(dbOrder: any): OrderRecord {
  const meta = (dbOrder.trackingMetadata && typeof dbOrder.trackingMetadata === "object"
    ? dbOrder.trackingMetadata
    : {}) as Partial<OrderRecord>;

  const normalizedStatus = normalizeDeliveryStatus(dbOrder.status);
  const dbReview = Array.isArray(dbOrder.reviews) && dbOrder.reviews.length > 0 ? dbOrder.reviews[0] : null;
  const resolvedReview = meta.review ?? (dbReview ? {
    rating: dbReview.rating,
    comment: dbReview.comment || undefined,
    createdAt: dbReview.createdAt instanceof Date ? dbReview.createdAt.toISOString() : String(dbReview.createdAt)
  } : undefined);

  const dbItems: OrderItemRecord[] = Array.isArray(dbOrder.items) && dbOrder.items.length > 0
    ? dbOrder.items.map((it: any) => ({
        id: it.id,
        storeProductId: it.storeProductId,
        productName: it.productName,
        sku: it.sku,
        unit: it.unit,
        quantity: it.quantity,
        priceMinor: it.priceMinorSnapshot,
        taxMinor: it.taxMinorSnapshot,
        discountMinor: it.discountMinorSnapshot,
        totalMinor: it.totalMinorSnapshot
      }))
    : [];

  // Prefer metadata items if DB OrderItems were empty (or enrich with imageUrl/category from metadata)
  const metaItems = Array.isArray(meta.items) ? meta.items : [];
  const resolvedItems: OrderItemRecord[] = dbItems.length > 0
    ? dbItems.map((it, idx) => ({
        ...it,
        imageUrl: metaItems[idx]?.imageUrl,
        category: metaItems[idx]?.category
      }))
    : metaItems;

  const createdAtIso = dbOrder.createdAt instanceof Date ? dbOrder.createdAt.toISOString() : String(dbOrder.createdAt || new Date().toISOString());
  const updatedAtIso = dbOrder.updatedAt instanceof Date ? dbOrder.updatedAt.toISOString() : String(dbOrder.updatedAt || createdAtIso);

  const statusHistory = Array.isArray(meta.statusHistory) && meta.statusHistory.length > 0
    ? meta.statusHistory
    : [
        {
          status: normalizedStatus,
          timestamp: updatedAtIso,
          note: "Order recorded in database",
          actor: "System"
        }
      ];

  const deliveryAddress = meta.deliveryAddress ?? (dbOrder.address
    ? {
        contactName: dbOrder.address.contactName,
        mobile: dbOrder.address.mobile,
        line1: dbOrder.address.line1,
        line2: dbOrder.address.line2 || undefined,
        city: dbOrder.address.city,
        state: dbOrder.address.state,
        postalCode: dbOrder.address.postalCode,
        label: dbOrder.address.label || undefined
      }
    : {
        contactName: dbOrder.customer?.name || "Customer",
        mobile: dbOrder.customer?.mobile || "",
        line1: "Delivery Address",
        city: "",
        state: "",
        postalCode: ""
      });

  return {
    id: dbOrder.id,
    orderNumber: meta.orderNumber || dbOrder.id,
    parentCheckoutId: dbOrder.parentCheckoutId,
    customerId: dbOrder.customerId,
    customerName: meta.customerName || deliveryAddress.contactName || dbOrder.customer?.name || "Customer",
    customerPhone: meta.customerPhone || deliveryAddress.mobile || dbOrder.customer?.mobile || "",
    customerEmail: meta.customerEmail || dbOrder.customer?.email,
    storeId: dbOrder.storeId,
    storeName: meta.storeName || dbOrder.store?.name || "Etukas Partner Store",
    sellerId: meta.sellerId || dbOrder.store?.sellerProfile?.sellerId || undefined,
    sellerPhone: meta.sellerPhone || dbOrder.store?.phone || dbOrder.store?.sellerProfile?.user?.mobile || undefined,
    addressId: dbOrder.addressId,
    deliveryAddress,
    status: normalizedStatus,
    subtotalMinor: dbOrder.subtotalMinor,
    taxMinor: dbOrder.taxMinor,
    discountMinor: dbOrder.discountMinor,
    deliveryChargeMinor: dbOrder.deliveryChargeMinor,
    protectFeeMinor: meta.protectFeeMinor ?? 4900,
    totalMinor: dbOrder.totalMinor,
    currency: dbOrder.currency || "INR",
    paymentMethod: meta.paymentMethod || "COD",
    paymentStatus: meta.paymentStatus || (normalizedStatus === "DELIVERED" ? "PAID" : "PENDING"),
    items: resolvedItems,
    vehicleNumber: meta.vehicleNumber,
    driverName: meta.driverName,
    driverPhone: meta.driverPhone,
    rejectionReason: meta.rejectionReason,
    deliveryOtp: meta.deliveryOtp,
    estimatedDeliveryDate: meta.estimatedDeliveryDate,
    gstin: meta.gstin,
    notes: meta.notes,
    statusNote: meta.statusNote,
    review: resolvedReview,
    statusHistory,
    createdAt: createdAtIso,
    updatedAt: updatedAtIso
  };
}

export const ORDER_DB_INCLUDE = {
  store: {
    include: {
      sellerProfile: {
        include: {
          user: { select: { mobile: true, email: true } }
        }
      }
    }
  },
  customer: { select: { id: true, name: true, mobile: true, email: true } },
  address: true,
  items: true,
  reviews: { orderBy: { createdAt: "desc" as const }, take: 1 }
};

export function orderMatchesSeller(
  order: Pick<OrderRecord, "storeId" | "sellerId">,
  profile: { id?: string; sellerId?: string | null },
  storeIds: string[]
): boolean {
  if (order.storeId && storeIds.includes(order.storeId)) return true;
  const orderSeller = order.sellerId?.trim().toLowerCase();
  const profileSeller = profile.sellerId?.trim().toLowerCase();
  if (orderSeller && profileSeller && orderSeller === profileSeller) return true;
  if (orderSeller && profile.id && orderSeller === profile.id.toLowerCase()) return true;
  return false;
}

export async function canPartnerManageOrder(order: OrderRecord, user: AuthUser): Promise<boolean> {
  if (user.roles.includes(Role.ADMIN)) return true;
  if (!user.roles.includes(Role.SELLER) && !user.roles.includes(Role.MANUFACTURER)) return false;

  try {
    const profile = await prisma.sellerProfile.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { user: { email: { equals: user.email, mode: "insensitive" } } }
        ]
      },
      include: { stores: { select: { id: true } } }
    });
    if (!profile) return false;
    const storeIds = profile.stores.map((s) => s.id);
    return orderMatchesSeller(order, profile, storeIds);
  } catch {
    // Offline fallback: allow matching by user.id when DB is unreachable
    return order.sellerId === user.id || order.storeId === user.id;
  }
}

export async function canUserAccessOrder(order: OrderRecord, user: AuthUser): Promise<boolean> {
  if (user.roles.includes(Role.ADMIN)) return true;
  if (order.customerId === user.id) return true;
  if (order.customerEmail && user.email && order.customerEmail.toLowerCase() === user.email.toLowerCase()) {
    return true;
  }
  return canPartnerManageOrder(order, user);
}

/**
 * Fetches an order by ID / orderNumber / parentCheckoutId.
 * Queries PostgreSQL first (essential for stateless serverless instances on Vercel)
 * and falls back to the local memory/file store if not in DB or DB is offline.
 */
export async function findOrderById(id: string): Promise<OrderRecord | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  // 1. Primary source of truth: PostgreSQL
  try {
    const dbOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { id: trimmed },
          { id: { equals: trimmed, mode: "insensitive" } },
          { parentCheckoutId: trimmed }
        ]
      },
      include: ORDER_DB_INCLUDE
    });

    if (dbOrder) {
      const mapped = mapDbOrderToRecord(dbOrder);
      saveOrder(mapped);
      return mapped;
    }
  } catch (err) {
    console.warn("DB order lookup fallback to memory store:", err);
  }

  // 2. Fallback: local memory / file store
  const clean = trimmed.toLowerCase();
  for (const ord of ordersMemoryStore.values()) {
    if (
      ord.id.toLowerCase() === clean ||
      (ord.orderNumber && ord.orderNumber.toLowerCase() === clean) ||
      (ord.parentCheckoutId && ord.parentCheckoutId.toLowerCase() === clean)
    ) {
      return ord;
    }
  }

  return null;
}

async function syncOrderTrackingToDb(order: OrderRecord, lookupId: string): Promise<void> {
  const prismaStatus = toPrismaOrderStatus(order.status);
  const where = {
    OR: [
      { id: order.id },
      { id: lookupId }
    ]
  };
  try {
    await prisma.order.updateMany({
      where,
      data: {
        status: prismaStatus,
        trackingMetadata: buildTrackingMetadata(order) as any
      }
    });
  } catch (err: any) {
    // Graceful fallback if trackingMetadata column migration has not been applied yet
    try {
      await prisma.order.updateMany({
        where,
        data: { status: prismaStatus }
      });
    } catch {
      console.warn("Prisma order status sync skipped:", err?.message || err);
    }
  }
}

export async function updateOrderTracking(
  id: string,
  update: OrderTrackingUpdateInput,
  actor = "Partner",
  options: { isAdmin?: boolean } = {}
): Promise<OrderRecord | null> {
  const order = await findOrderById(id);
  if (!order) return null;

  const isAdmin = Boolean(options.isAdmin);
  const previousStatus = normalizeDeliveryStatus(order.status);
  const normalizedStatus = normalizeDeliveryStatus(update.status);

  // Enforce transition rules for partners (Admin may still intervene/override)
  if (!isAdmin) {
    if (TERMINAL_STATUSES.has(previousStatus)) {
      throw new HttpError(
        409,
        "ORDER_TERMINAL_STATE",
        `Cannot update an order that is already ${previousStatus.toLowerCase()}.`
      );
    }
    if (normalizedStatus === "PLACED") {
      throw new HttpError(
        400,
        "INVALID_STATUS_TRANSITION",
        "Select a fulfillment stage (Confirmed, Loading Vehicle, Assigned Delivery, Delivered, or Rejected)."
      );
    }
    const prevRank = DELIVERY_STAGE_RANK[previousStatus];
    const nextRank = DELIVERY_STAGE_RANK[normalizedStatus];
    if (nextRank >= 0 && prevRank >= 0 && nextRank < prevRank) {
      throw new HttpError(
        400,
        "INVALID_STATUS_TRANSITION",
        `Cannot move order backward from ${previousStatus.replace(/_/g, " ")} to ${normalizedStatus.replace(/_/g, " ")}.`
      );
    }
  }

  // Compute effective fields (allow intentional clearing when "" or null is provided)
  const nextVehicleNumber =
    update.vehicleNumber !== undefined
      ? (update.vehicleNumber?.trim() || undefined)
      : order.vehicleNumber;
  const nextDriverName =
    update.driverName !== undefined
      ? (update.driverName?.trim() || undefined)
      : order.driverName;
  const nextDriverPhone =
    update.driverPhone !== undefined
      ? (update.driverPhone?.trim() || undefined)
      : order.driverPhone;
  const nextRejectionReason =
    update.rejectionReason !== undefined
      ? (update.rejectionReason?.trim() || undefined)
      : order.rejectionReason;

  // Validate stage-specific required fields
  if (normalizedStatus === "LOADING_VEHICLE" && !nextVehicleNumber) {
    throw new HttpError(400, "VEHICLE_REQUIRED", "Vehicle number is required for Loading on Vehicle stage.");
  }
  if (normalizedStatus === "ASSIGNED_DRIVER") {
    if (!nextVehicleNumber) {
      throw new HttpError(400, "VEHICLE_REQUIRED", "Vehicle number is required when assigning a delivery partner.");
    }
    if (!nextDriverName || !nextDriverPhone) {
      throw new HttpError(400, "DRIVER_DETAILS_REQUIRED", "Driver name and contact phone are required when assigning a delivery partner.");
    }
    const digits = nextDriverPhone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) {
      throw new HttpError(400, "INVALID_DRIVER_PHONE", "Please enter a valid 10-digit driver phone number.");
    }
  }
  if (normalizedStatus === "REJECTED" && !nextRejectionReason) {
    throw new HttpError(400, "REJECTION_REASON_REQUIRED", "Rejection reason is required when rejecting an order.");
  }

  order.status = normalizedStatus;
  order.vehicleNumber = nextVehicleNumber;
  order.driverName = nextDriverName;
  order.driverPhone = nextDriverPhone;
  order.rejectionReason = normalizedStatus === "REJECTED" ? nextRejectionReason : undefined;

  // Mark COD orders as PAID once delivered
  if (normalizedStatus === "DELIVERED" && order.paymentMethod === "COD") {
    order.paymentStatus = "PAID";
  }

  const customNote = update.note?.trim() || "";
  const defaultNote =
    customNote ||
    (normalizedStatus === "CONFIRMED"
      ? "Order confirmed by seller store"
      : normalizedStatus === "LOADING_VEHICLE"
      ? `Material loading in vehicle ${nextVehicleNumber || ""}`.trim()
      : normalizedStatus === "ASSIGNED_DRIVER"
      ? `Delivery partner ${nextDriverName || "driver"} assigned (${nextVehicleNumber || "vehicle"})`
      : normalizedStatus === "DELIVERED"
      ? "Order successfully delivered at site"
      : normalizedStatus === "REJECTED"
      ? `Order rejected: ${nextRejectionReason || "Store unavailable"}`
      : normalizedStatus === "CANCELLED"
      ? "Order cancelled"
      : "Order status updated");

  // Always update statusNote on status change or explicit note so old stage notes never stick
  if (customNote) {
    order.statusNote = customNote;
  } else if (update.note === "" || update.note === null) {
    order.statusNote = undefined;
  } else if (previousStatus !== normalizedStatus) {
    order.statusNote = defaultNote;
  }

  if (!Array.isArray(order.statusHistory)) {
    order.statusHistory = [];
  }
  order.statusHistory.push({
    status: normalizedStatus,
    timestamp: new Date().toISOString(),
    note: defaultNote,
    actor
  });

  order.updatedAt = new Date().toISOString();
  saveOrder(order);

  await syncOrderTrackingToDb(order, id);

  return order;
}

// ---------- Routes ----------

ordersRouter.use(requireAuth);

/**
 * POST /api/v1/orders
 * Places a 3-step checkout order (Cash on Delivery or Online).
 * Splits multi-store carts into one order per store sharing parentCheckoutId.
 */
ordersRouter.post("/", async (req, res, next) => {
  try {
    const input: CheckoutInput = checkoutSchema.parse(req.body);
    const parentCheckoutId = randomUUID();
    const user = req.user!;

    // Fetch user name/mobile from DB if available
    let dbUser: { name: string; mobile: string; email: string } | null = null;
    try {
      dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, mobile: true, email: true }
      });
    } catch {}

    // Resolve delivery address
    let deliveryAddress = input.deliveryAddress;
    if (!deliveryAddress && input.addressId) {
      try {
        const dbAddress = await prisma.address.findFirst({
          where: { id: input.addressId, userId: user.id }
        });
        if (dbAddress) {
          deliveryAddress = {
            contactName: dbAddress.contactName,
            mobile: dbAddress.mobile,
            line1: dbAddress.line1,
            line2: dbAddress.line2 || undefined,
            city: dbAddress.city,
            state: dbAddress.state,
            postalCode: dbAddress.postalCode,
            label: dbAddress.label
          };
        }
      } catch {}
    }

    if (!deliveryAddress) {
      deliveryAddress = {
        contactName: dbUser?.name || "Customer",
        mobile: dbUser?.mobile || "9848012345",
        line1: "Site Address, Main Road",
        city: "Kakinada",
        state: "Andhra Pradesh",
        postalCode: "533001",
        label: "Delivery Site"
      };
    }

    // Collect line items with their store associations
    type PendingItem = OrderItemRecord & { storeId?: string; storeName?: string };
    let pendingItems: PendingItem[] = [];

    if (input.items && input.items.length > 0) {
      pendingItems = input.items.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        storeProductId: item.storeProductId,
        productName: item.productName,
        unit: item.unit || "piece",
        quantity: item.quantity,
        priceMinor: item.priceMinor,
        totalMinor: item.priceMinor * item.quantity,
        imageUrl: item.imageUrl,
        category: item.category,
        storeId: item.storeId,
        storeName: item.storeName
      }));
    } else {
      try {
        const cart = await prisma.cart.findUnique({
          where: { userId: user.id },
          include: {
            items: {
              include: {
                storeProduct: {
                  include: {
                    product: { include: { category: true, images: true } },
                    store: true
                  }
                }
              }
            }
          }
        });
        if (cart && cart.items.length > 0) {
          pendingItems = cart.items.map((item, idx) => ({
            id: `item-${Date.now()}-${idx}`,
            storeProductId: item.storeProductId,
            productName: item.storeProduct.product.name,
            sku: item.storeProduct.sku,
            unit: item.storeProduct.product.unit,
            quantity: item.quantity,
            priceMinor: item.storeProduct.priceMinor,
            totalMinor: item.storeProduct.priceMinor * item.quantity,
            imageUrl: item.storeProduct.product.images?.[0]?.url,
            category: item.storeProduct.product.category?.name || "Materials",
            storeId: item.storeProduct.store?.id,
            storeName: item.storeProduct.store?.name
          }));
        }
      } catch {}
    }

    if (pendingItems.length === 0) {
      throw new HttpError(400, "EMPTY_ORDER", "Your cart is empty. Add at least one item before placing an order.");
    }

    // Enrich items with authoritative store/seller info from PostgreSQL when available
    const storeProductIds = pendingItems.map((it) => it.storeProductId).filter(Boolean) as string[];
    const storeInfoById = new Map<string, { id: string; name: string; phone: string; sellerId?: string }>();
    const dbStoreProductMap = new Map<string, { id: string; sku: string; storeId: string; priceMinor: number }>();

    try {
      if (storeProductIds.length > 0) {
        const spList = await prisma.storeProduct.findMany({
          where: { id: { in: storeProductIds } },
          include: {
            store: {
              include: {
                sellerProfile: {
                  select: { sellerId: true, user: { select: { mobile: true } } }
                }
              }
            }
          }
        });
        for (const sp of spList) {
          dbStoreProductMap.set(sp.id, {
            id: sp.id,
            sku: sp.sku,
            storeId: sp.storeId,
            priceMinor: sp.priceMinor
          });
          if (sp.store) {
            storeInfoById.set(sp.store.id, {
              id: sp.store.id,
              name: sp.store.name,
              phone: sp.store.phone || sp.store.sellerProfile?.user?.mobile || "",
              sellerId: sp.store.sellerProfile?.sellerId || undefined
            });
          }
        }
      }

      const explicitStoreIds = Array.from(
        new Set(pendingItems.map((it) => it.storeId).filter((sid): sid is string => Boolean(sid) && !storeInfoById.has(sid!)))
      );
      if (explicitStoreIds.length > 0) {
        const stores = await prisma.store.findMany({
          where: { id: { in: explicitStoreIds } },
          include: {
            sellerProfile: {
              select: { sellerId: true, user: { select: { mobile: true } } }
            }
          }
        });
        for (const store of stores) {
          storeInfoById.set(store.id, {
            id: store.id,
            name: store.name,
            phone: store.phone || store.sellerProfile?.user?.mobile || "",
            sellerId: store.sellerProfile?.sellerId || undefined
          });
        }
      }
    } catch {
      // DB offline; continue with item metadata
    }

    // Group items by storeId so multi-store carts create separate store orders
    const itemsByStore = new Map<string, PendingItem[]>();
    for (const item of pendingItems) {
      const dbSp = item.storeProductId ? dbStoreProductMap.get(item.storeProductId) : undefined;
      const resolvedStoreId = dbSp?.storeId || item.storeId || "store-kakinada-1";
      const enrichedItem: PendingItem = {
        ...item,
        sku: item.sku || dbSp?.sku,
        storeId: resolvedStoreId
      };
      const group = itemsByStore.get(resolvedStoreId) ?? [];
      group.push(enrichedItem);
      itemsByStore.set(resolvedStoreId, group);
    }

    // Resolve or create DB address once if DB is available
    let dbAddressId: string | undefined;
    try {
      if (input.addressId) {
        const existing = await prisma.address.findFirst({ where: { id: input.addressId, userId: user.id } });
        if (existing) dbAddressId = existing.id;
      }
      if (!dbAddressId) {
        const createdAddr = await prisma.address.create({
          data: {
            userId: user.id,
            label: deliveryAddress.label || "Home",
            contactName: deliveryAddress.contactName,
            mobile: deliveryAddress.mobile,
            line1: deliveryAddress.line1,
            line2: deliveryAddress.line2,
            city: deliveryAddress.city,
            state: deliveryAddress.state,
            postalCode: deliveryAddress.postalCode
          }
        });
        dbAddressId = createdAddr.id;
      }
    } catch {
      // Offline fallback
    }

    const createdOrders: OrderRecord[] = [];
    const nowIso = new Date().toISOString();

    for (const [groupStoreId, groupItems] of itemsByStore.entries()) {
      const orderNumber = generateOrderId();
      const storeMeta = storeInfoById.get(groupStoreId);
      const storeName = storeMeta?.name || groupItems[0]?.storeName || "Etukas Partner Store";
      const sellerId = storeMeta?.sellerId || (groupStoreId === "store-kakinada-1" ? "SELLER-10247" : undefined);
      const sellerPhone = storeMeta?.phone || undefined;

      const cleanItems: OrderItemRecord[] = groupItems.map(({ storeId: _s, storeName: _sn, ...rest }) => rest);

      // Pricing matches CheckoutPage (GST-inclusive catalog prices + ₹49 protect fee + conditional delivery fee)
      const subtotalMinor = cleanItems.reduce((sum, item) => sum + item.totalMinor, 0);
      const taxMinor = 0;
      const discountMinor = 0;
      const deliveryChargeMinor = subtotalMinor > 500000 ? 0 : 25000;
      const protectFeeMinor = 4900;
      const totalMinor = subtotalMinor + deliveryChargeMinor + protectFeeMinor;

      const newOrder: OrderRecord = {
        id: orderNumber,
        orderNumber,
        parentCheckoutId,
        customerId: user.id,
        customerName: deliveryAddress.contactName,
        customerPhone: deliveryAddress.mobile,
        customerEmail: dbUser?.email || user.email,
        storeId: groupStoreId,
        storeName,
        sellerId,
        sellerPhone,
        addressId: dbAddressId,
        deliveryAddress,
        status: "PLACED",
        subtotalMinor,
        taxMinor,
        discountMinor,
        deliveryChargeMinor,
        protectFeeMinor,
        totalMinor,
        currency: "INR",
        paymentMethod: input.paymentMethod || "COD",
        paymentStatus: input.paymentMethod === "COD" ? "PENDING" : "PAID",
        items: cleanItems,
        gstin: input.gstin,
        notes: input.notes,
        statusHistory: [
          {
            status: "PLACED",
            timestamp: nowIso,
            note: `Order placed via ${input.paymentMethod === "COD" ? "Cash on Delivery" : input.paymentMethod}. Sent to ${storeName} for confirmation.`,
            actor: "Customer"
          }
        ],
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // Save to PostgreSQL first (with full trackingMetadata + OrderItems where valid)
      try {
        if (dbAddressId && storeMeta) {
          const validDbItems = cleanItems
            .filter((it) => it.storeProductId && dbStoreProductMap.has(it.storeProductId))
            .map((it) => ({
              storeProductId: it.storeProductId!,
              productName: it.productName,
              sku: it.sku || dbStoreProductMap.get(it.storeProductId!)!.sku,
              unit: it.unit,
              quantity: it.quantity,
              priceMinorSnapshot: it.priceMinor,
              taxMinorSnapshot: 0,
              discountMinorSnapshot: 0,
              totalMinorSnapshot: it.totalMinor
            }));

          const baseOrderData = {
            id: newOrder.id,
            parentCheckoutId,
            customerId: user.id,
            storeId: storeMeta.id,
            addressId: dbAddressId,
            status: OrderStatus.PLACED,
            subtotalMinor: newOrder.subtotalMinor,
            taxMinor: newOrder.taxMinor,
            discountMinor: newOrder.discountMinor,
            deliveryChargeMinor: newOrder.deliveryChargeMinor,
            totalMinor: newOrder.totalMinor,
            ...(validDbItems.length > 0 ? { items: { create: validDbItems } } : {})
          };

          try {
            await prisma.order.create({
              data: {
                ...baseOrderData,
                trackingMetadata: buildTrackingMetadata(newOrder) as any
              }
            });
          } catch {
            // Fallback if trackingMetadata column migration hasn't been applied yet
            await prisma.order.create({ data: baseOrderData });
          }
        }
      } catch (dbErr) {
        console.warn("[orders] Could not persist order in Prisma, using fallback store:", dbErr);
      }

      saveOrder(newOrder);
      createdOrders.push(newOrder);

      // Notify Admin
      try {
        await prisma.adminNotification.create({
          data: {
            type: AdminNotificationType.SYSTEM,
            title: `New Material Order: ${newOrder.orderNumber}`,
            body: `${newOrder.customerName} placed order for ${newOrder.items.length} items (Total: ₹${(newOrder.totalMinor / 100).toLocaleString("en-IN")})`,
            metadata: { orderId: newOrder.id, orderNumber: newOrder.orderNumber, storeName: newOrder.storeName } as any
          }
        });
      } catch {}
    }

    // Clear cart items in DB once order(s) are created
    try {
      const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    } catch {}

    const primaryOrder = createdOrders[0];
    return sendCreated(res, {
      order: primaryOrder,
      orders: createdOrders,
      orderNumber: primaryOrder.orderNumber,
      parentCheckoutId,
      message: "Order placed successfully! Thanks for ordering in Etukas."
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orders
 * Returns the logged-in customer's own placed orders (PostgreSQL first, merged with fallback).
 */
ordersRouter.get("/", async (req, res, next) => {
  try {
    const user = req.user!;
    const userEmailLower = (user.email || "").toLowerCase();

    const orderMap = new Map<string, OrderRecord>();

    // 1. Primary: PostgreSQL
    try {
      const dbOrders = await prisma.order.findMany({
        where: { customerId: user.id },
        include: ORDER_DB_INCLUDE,
        orderBy: { createdAt: "desc" }
      });
      for (const dbOrd of dbOrders) {
        const mapped = mapDbOrderToRecord(dbOrd);
        orderMap.set(mapped.id, mapped);
      }
    } catch {}

    // 2. Fallback: file/memory orders for this customer only (never demo orders, never substring phone match)
    const fileOrders = loadOrders().filter((o) => {
      if (o.customerId === "cust-demo-1" || o.customerId === "cust-demo-2") return false;
      if (o.customerId === user.id) return true;
      if (userEmailLower && (o.customerEmail || "").toLowerCase() === userEmailLower) return true;
      return false;
    });

    for (const ord of fileOrders) {
      if (!orderMap.has(ord.id)) {
        orderMap.set(ord.id, { ...ord, status: normalizeDeliveryStatus(ord.status) });
      }
    }

    const result = Array.from(orderMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return sendOk(res, result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orders/:id
 * Fetches order details by Order ID for live tracking (authorized customer, owning partner, or admin only).
 */
ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const order = await findOrderById(req.params.id);
    if (!order) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }
    const allowed = await canUserAccessOrder(order, req.user!);
    if (!allowed) {
      throw new HttpError(403, "FORBIDDEN", "You do not have permission to view this order");
    }
    return sendOk(res, order);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/orders/:id/tracking
 * Live status update on order — strictly restricted to Admin or the owning Store Partner.
 */
ordersRouter.patch(
  "/:id/tracking",
  requireRole(Role.SELLER, Role.MANUFACTURER, Role.ADMIN),
  async (req, res, next) => {
    try {
      const existing = await findOrderById(req.params.id);
      if (!existing) {
        throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
      }
      const isAdmin = req.user!.roles.includes(Role.ADMIN);
      if (!isAdmin) {
        const canManage = await canPartnerManageOrder(existing, req.user!);
        if (!canManage) {
          throw new HttpError(403, "FORBIDDEN", "You do not have permission to update tracking for this order");
        }
      }
      const updateInput = orderTrackingUpdateSchema.parse(req.body);
      const updated = await updateOrderTracking(
        req.params.id,
        updateInput,
        isAdmin ? "Admin" : "Store Partner",
        { isAdmin }
      );
      if (!updated) {
        throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
      }
      return sendOk(res, updated);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/v1/orders/:id/reviews
 * Customer submits rating & review after the order is delivered
 */
ordersRouter.post("/:id/reviews", async (req, res, next) => {
  try {
    const input = orderReviewSchema.parse(req.body);
    const order = await findOrderById(req.params.id);
    if (!order) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }

    if (order.customerId && req.user?.id && order.customerId !== req.user.id && !req.user.roles?.includes("ADMIN")) {
      throw new HttpError(403, "FORBIDDEN", "You can only submit reviews for your own orders");
    }

    if (order.status !== "DELIVERED") {
      throw new HttpError(400, "ORDER_NOT_DELIVERED", "Reviews can only be submitted after the product is delivered.");
    }

    const reviewRecord = {
      rating: input.rating,
      comment: input.comment || undefined,
      createdAt: new Date().toISOString()
    };

    order.review = reviewRecord;
    order.updatedAt = new Date().toISOString();

    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: "DELIVERED",
      timestamp: new Date().toISOString(),
      note: `Customer submitted ${input.rating}★ review: "${input.comment || "Delivered successfully"}"`,
      actor: "Customer"
    });

    saveOrder(order);
    await syncOrderTrackingToDb(order, req.params.id);

    try {
      if (req.user?.id) {
        await prisma.review.upsert({
          where: {
            userId_orderId: {
              userId: req.user.id,
              orderId: order.id
            }
          },
          update: {
            rating: input.rating,
            comment: input.comment || null
          },
          create: {
            userId: req.user.id,
            orderId: order.id,
            rating: input.rating,
            comment: input.comment || null
          }
        });
      }
    } catch (dbErr) {
      console.warn("[orders] Could not sync review to Prisma DB:", dbErr);
    }

    return sendCreated(res, {
      message: "Review submitted successfully! Thank you for your feedback.",
      review: reviewRecord,
      order
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orders/:id/reviews
 * Returns review for an order if submitted
 */
ordersRouter.get("/:id/reviews", async (req, res, next) => {
  try {
    const order = await findOrderById(req.params.id);
    if (!order) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }
    const allowed = await canUserAccessOrder(order, req.user!);
    if (!allowed) {
      throw new HttpError(403, "FORBIDDEN", "You do not have permission to view this order review");
    }
    return sendOk(res, order.review || null);
  } catch (error) {
    next(error);
  }
});
