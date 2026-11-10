import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  checkoutSchema,
  orderTrackingUpdateSchema,
  type CheckoutInput,
  type OrderTrackingUpdateInput
} from "@etukas/shared";
import { AdminNotificationType, OrderStatus, PaymentProvider, PaymentStatus } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError, sendCreated, sendOk } from "../../utils/http.js";
import { lineTotals } from "../../utils/money.js";

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
  statusHistory: Array<{
    status: DeliveryStatus;
    timestamp: string;
    note?: string;
    actor?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// ---------- Helper Functions & Storage ----------

export function generateOrderId(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000).toString();
  return `ETORD${randomDigits}`;
}

const DATA_DIR = path.resolve(__dirname, "../../../data");
const SERVER_DATA_DIR = path.resolve(__dirname, "../../data");

function getOrdersFilePaths(): string[] {
  return [
    path.join(DATA_DIR, "orders.json"),
    path.join(SERVER_DATA_DIR, "orders.json"),
    path.resolve(process.cwd(), "data", "orders.json"),
    path.resolve(process.cwd(), "server", "data", "orders.json")
  ];
}

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
    subtotalMinor: 14500000,
    taxMinor: 2350000,
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

export function loadOrders(): OrderRecord[] {
  const filePaths = getOrdersFilePaths();
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf8");
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          return list;
        }
      } catch {
        // Fall through to next file
      }
    }
  }

  // If no file exists, initialize seed
  try {
    const targetPath = filePaths[0];
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(targetPath, JSON.stringify(SEED_ORDERS, null, 2), "utf8");
  } catch {}

  return SEED_ORDERS;
}

export function saveOrders(orders: OrderRecord[]): void {
  const filePaths = getOrdersFilePaths();
  for (const filePath of filePaths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(orders, null, 2), "utf8");
    } catch {
      // Non-blocking
    }
  }
}

export function saveOrder(order: OrderRecord): void {
  const current = loadOrders();
  const index = current.findIndex(
    (o) => o.id === order.id || o.orderNumber === order.orderNumber
  );
  if (index >= 0) {
    current[index] = { ...current[index], ...order, updatedAt: new Date().toISOString() };
  } else {
    current.unshift(order);
  }
  saveOrders(current);
}

export function findOrderById(id: string): OrderRecord | null {
  const clean = id.trim().toLowerCase();
  const current = loadOrders();
  const match = current.find(
    (o) => o.id.toLowerCase() === clean || o.orderNumber.toLowerCase() === clean
  );
  return match || null;
}

export function updateOrderTracking(
  id: string,
  update: OrderTrackingUpdateInput,
  actor = "Partner"
): OrderRecord | null {
  const order = findOrderById(id);
  if (!order) return null;

  order.status = update.status as DeliveryStatus;
  if (update.vehicleNumber !== undefined) order.vehicleNumber = update.vehicleNumber;
  if (update.driverName !== undefined) order.driverName = update.driverName;
  if (update.driverPhone !== undefined) order.driverPhone = update.driverPhone;
  if (update.rejectionReason !== undefined) order.rejectionReason = update.rejectionReason;

  const defaultNote =
    update.note ||
    (update.status === "CONFIRMED"
      ? "Order confirmed by seller store"
      : update.status === "LOADING_VEHICLE"
      ? `Material loading in vehicle ${update.vehicleNumber || order.vehicleNumber || ""}`.trim()
      : update.status === "ASSIGNED_DRIVER"
      ? `Delivery partner ${update.driverName || order.driverName || "driver"} assigned`.trim()
      : update.status === "DELIVERED"
      ? "Order successfully delivered at site"
      : update.status === "REJECTED"
      ? `Order rejected by seller: ${update.rejectionReason || "Store unavailable"}`
      : "Order status updated");

  order.statusHistory.push({
    status: update.status as DeliveryStatus,
    timestamp: new Date().toISOString(),
    note: defaultNote,
    actor
  });

  order.updatedAt = new Date().toISOString();
  saveOrder(order);
  return order;
}

// ---------- Routes ----------

ordersRouter.use(requireAuth);

/**
 * POST /api/v1/orders
 * Places a 3-step checkout order (Cash on Delivery or Online)
 */
ordersRouter.post("/", async (req, res, next) => {
  try {
    const input: CheckoutInput = checkoutSchema.parse(req.body);
    const parentCheckoutId = randomUUID();
    const orderNumber = generateOrderId();
    const user = req.user!;

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
      // Default to user info if none provided
      deliveryAddress = {
        contactName: (user as any).name || "Customer",
        mobile: (user as any).mobile || "9848012345",
        line1: "Site Address, Main Road",
        city: "Kakinada",
        state: "Andhra Pradesh",
        postalCode: "533001",
        label: "Delivery Site"
      };
    }

    // Resolve items: from input.items or from user's Cart
    let orderItems: OrderItemRecord[] = [];
    let storeId = "store-kakinada-1";
    let storeName = "Etukas Partner Store";
    let sellerId = "SELLER-10247";

    if (input.items && input.items.length > 0) {
      // Direct items passed from checkout
      orderItems = input.items.map((item, idx) => ({
        id: `item-${Date.now()}-${idx}`,
        storeProductId: item.storeProductId,
        productName: item.productName,
        unit: item.unit || "piece",
        quantity: item.quantity,
        priceMinor: item.priceMinor,
        totalMinor: item.priceMinor * item.quantity,
        imageUrl: item.imageUrl,
        category: item.category
      }));
      if (input.items[0]?.storeId) storeId = input.items[0].storeId;
      if (input.items[0]?.storeName) storeName = input.items[0].storeName;
    } else {
      // Fetch from Cart
      try {
        const cart = await prisma.cart.findUnique({
          where: { userId: user.id },
          include: { items: { include: { storeProduct: { include: { product: true, store: true } } } } }
        });
        if (cart && cart.items.length > 0) {
          orderItems = cart.items.map((item, idx) => {
            const price = item.storeProduct.priceMinor;
            if (item.storeProduct.store) {
              storeId = item.storeProduct.store.id;
              storeName = item.storeProduct.store.name;
            }
            return {
              id: `item-${Date.now()}-${idx}`,
              storeProductId: item.storeProductId,
              productName: item.storeProduct.product.name,
              sku: item.storeProduct.sku,
              unit: item.storeProduct.product.unit,
              quantity: item.quantity,
              priceMinor: price,
              totalMinor: price * item.quantity,
              category: (item.storeProduct.product as any).category?.name || "Materials"
            };
          });
        }
      } catch {}
    }

    // Fallback item if cart was empty in offline mode
    if (orderItems.length === 0) {
      orderItems = [
        {
          id: `item-${Date.now()}-0`,
          productName: "UltraTech Super Cement (50kg Bag)",
          unit: "bag",
          quantity: 20,
          priceMinor: 38500,
          totalMinor: 770000,
          category: "Cement"
        }
      ];
    }

    // Calculate totals
    const subtotalMinor = orderItems.reduce((sum, item) => sum + item.totalMinor, 0);
    const taxMinor = Math.round(subtotalMinor * 0.18);
    const discountMinor = Math.round(subtotalMinor * 0.1); // 10% instant checkout discount
    const deliveryChargeMinor = subtotalMinor > 500000 ? 0 : 25000;
    const protectFeeMinor = 4900; // ₹49 protection & site inspection fee
    const totalMinor = subtotalMinor + taxMinor - discountMinor + deliveryChargeMinor + protectFeeMinor;

    const newOrder: OrderRecord = {
      id: orderNumber,
      orderNumber,
      parentCheckoutId,
      customerId: user.id,
      customerName: deliveryAddress.contactName,
      customerPhone: deliveryAddress.mobile,
      customerEmail: user.email,
      storeId,
      storeName,
      sellerId,
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
      paymentStatus: "PENDING",
      items: orderItems,
      gstin: input.gstin,
      notes: input.notes,
      statusHistory: [
        {
          status: "PLACED",
          timestamp: new Date().toISOString(),
          note: `Order placed via ${input.paymentMethod === "COD" ? "Cash on Delivery" : input.paymentMethod}. Sent to ${storeName} for confirmation.`,
          actor: "Customer"
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to persistent file storage
    saveOrder(newOrder);

    // Sync with Prisma if database is available
    try {
      const address = await prisma.address.findFirst({ where: { userId: user.id } });
      const addressId = address?.id || (await prisma.address.create({
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
      })).id;

      await prisma.order.create({
        data: {
          id: newOrder.id,
          parentCheckoutId,
          customerId: user.id,
          storeId: newOrder.storeId,
          addressId,
          status: OrderStatus.PLACED,
          subtotalMinor: newOrder.subtotalMinor,
          taxMinor: newOrder.taxMinor,
          discountMinor: newOrder.discountMinor,
          deliveryChargeMinor: newOrder.deliveryChargeMinor,
          totalMinor: newOrder.totalMinor
        }
      });

      // Clear cart items in DB
      const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
      if (cart) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    } catch {
      // Non-blocking offline fallback
    }

    // Notify Admin & Store
    try {
      await prisma.adminNotification.create({
        data: {
          type: AdminNotificationType.SYSTEM,
          title: `New Material Order: ${newOrder.orderNumber}`,
          body: `${newOrder.customerName} placed order for ${newOrder.items.length} items (Total: ₹${(newOrder.totalMinor / 100).toLocaleString("en-IN")})`,
          metadata: newOrder as any
        }
      });
    } catch {}

    return sendCreated(res, {
      order: newOrder,
      orderNumber: newOrder.orderNumber,
      parentCheckoutId,
      message: "Order placed successfully! Thanks for ordering in Etukas."
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orders
 * Returns customer's placed orders
 */
ordersRouter.get("/", async (req, res, next) => {
  try {
    const user = req.user!;
    const all = loadOrders();
    const userPhoneClean = ((user as any).mobile || "").replace(/\D/g, "");
    const userEmailLower = (user.email || "").toLowerCase();

    const customerOrders = all.filter((o) => {
      if (o.customerId === user.id) return true;
      if (userPhoneClean && (o.customerPhone || "").replace(/\D/g, "").includes(userPhoneClean)) return true;
      if (userEmailLower && (o.customerEmail || "").toLowerCase() === userEmailLower) return true;
      return false;
    });

    // If user has no orders yet, return the list (or seed orders for demo purposes)
    return sendOk(res, customerOrders.length > 0 ? customerOrders : all.slice(0, 3));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orders/:id
 * Fetches order details by Order ID or database ID for live tracking
 */
ordersRouter.get("/:id", async (req, res, next) => {
  try {
    const order = findOrderById(req.params.id);
    if (!order) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }
    return sendOk(res, order);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/orders/:id/tracking
 * Live status update on order (e.g. Loading on Vehicle, Assigned Driver, Delivered)
 */
ordersRouter.patch("/:id/tracking", async (req, res, next) => {
  try {
    const updateInput = orderTrackingUpdateSchema.parse(req.body);
    const updated = updateOrderTracking(req.params.id, updateInput, req.user?.roles?.includes("ADMIN") ? "Admin" : "Store Partner");
    if (!updated) {
      throw new HttpError(404, "ORDER_NOT_FOUND", "Order not found");
    }
    return sendOk(res, updated);
  } catch (error) {
    next(error);
  }
});
