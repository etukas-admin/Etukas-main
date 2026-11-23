import { describe, expect, it, vi, afterEach } from "vitest";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import {
  buildTrackingMetadata,
  cancelCustomerOrder,
  canUserAccessOrder,
  mapDbOrderToRecord,
  orderMatchesSeller,
  saveOrder,
  updateOrderTracking,
  type OrderRecord
} from "../modules/orders/orders.routes.js";

function makeOrder(overrides: Partial<OrderRecord> = {}): OrderRecord {
  const now = new Date().toISOString();
  return {
    id: `ETORD${Math.floor(100000 + Math.random() * 899999)}`,
    orderNumber: "ETORD555111",
    parentCheckoutId: "chk-test-1",
    customerId: "cust-1",
    customerName: "Raju Builder",
    customerPhone: "9848011111",
    customerEmail: "raju@example.com",
    storeId: "store-a",
    storeName: "Alpha Materials",
    sellerId: "SEA11111",
    deliveryAddress: {
      contactName: "Raju Builder",
      mobile: "9848011111",
      line1: "Plot 10",
      city: "Kakinada",
      state: "Andhra Pradesh",
      postalCode: "533001"
    },
    status: "PLACED",
    subtotalMinor: 100000,
    taxMinor: 0,
    discountMinor: 0,
    deliveryChargeMinor: 25000,
    protectFeeMinor: 4900,
    totalMinor: 129900,
    currency: "INR",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    items: [
      {
        id: "item-1",
        productName: "Cement 53 Grade",
        unit: "bag",
        quantity: 2,
        priceMinor: 50000,
        totalMinor: 100000
      }
    ],
    statusHistory: [{ status: "PLACED", timestamp: now, note: "Order placed", actor: "Customer" }],
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("Order Live Tracking & Security", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isolates partner orders strictly by storeId or sellerId", () => {
    const orderA = makeOrder({ storeId: "store-a", sellerId: "SEA11111" });
    const orderB = makeOrder({ storeId: "store-b", sellerId: "SEA22222" });

    expect(orderMatchesSeller(orderA, { id: "prof-a", sellerId: "SEA11111" }, ["store-a"])).toBe(true);
    expect(orderMatchesSeller(orderB, { id: "prof-a", sellerId: "SEA11111" }, ["store-a"])).toBe(false);
  });

  it("blocks unauthorized customers from accessing another customer's order", async () => {
    vi.spyOn(prisma.sellerProfile, "findFirst").mockResolvedValue(null);
    const order = makeOrder({ customerId: "cust-1", customerEmail: "owner@example.com" });

    expect(
      await canUserAccessOrder(order, { id: "cust-1", email: "owner@example.com", roles: [Role.CUSTOMER] })
    ).toBe(true);
    expect(
      await canUserAccessOrder(order, { id: "cust-other", email: "stranger@example.com", roles: [Role.CUSTOMER] })
    ).toBe(false);
    expect(
      await canUserAccessOrder(order, { id: "admin-1", email: "admin@etukas.com", roles: [Role.ADMIN] })
    ).toBe(true);
  });

  it("enforces required fields, clears stale statusNote on stage advance, and marks COD PAID on delivery", async () => {
    vi.spyOn(prisma.order, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 } as never);

    const ord = makeOrder({ id: "ETORD777001", orderNumber: "ETORD777001" });
    saveOrder(ord);

    // Rejects PLACED no-op for Partner
    await expect(updateOrderTracking(ord.id, { status: "PLACED" }, "Partner")).rejects.toThrow(/Select a fulfillment stage/i);

    // Rejects LOADING_VEHICLE without vehicle number
    await expect(updateOrderTracking(ord.id, { status: "LOADING_VEHICLE" }, "Partner")).rejects.toThrow(/Vehicle number is required/i);

    // Move to LOADING_VEHICLE with custom note
    const loaded = await updateOrderTracking(
      ord.id,
      { status: "LOADING_VEHICLE", vehicleNumber: "AP 05 TX 9999", note: "Loading starts at 2 PM" },
      "Partner"
    );
    expect(loaded?.status).toBe("LOADING_VEHICLE");
    expect(loaded?.statusNote).toBe("Loading starts at 2 PM");

    // Blocks partner from moving backward to CONFIRMED
    await expect(updateOrderTracking(ord.id, { status: "CONFIRMED" }, "Partner")).rejects.toThrow(/Cannot move order backward/i);

    // Rejects ASSIGNED_DRIVER without driver details
    await expect(updateOrderTracking(ord.id, { status: "ASSIGNED_DRIVER" }, "Partner")).rejects.toThrow(/Driver name and contact phone/i);

    // Move to ASSIGNED_DRIVER then DELIVERED without custom note — stale note must be replaced
    const assigned = await updateOrderTracking(
      ord.id,
      { status: "ASSIGNED_DRIVER", vehicleNumber: "AP 05 TX 9999", driverName: "Suresh", driverPhone: "9848099887" },
      "Partner"
    );
    expect(assigned?.status).toBe("ASSIGNED_DRIVER");
    expect(assigned?.statusNote).not.toBe("Loading starts at 2 PM");

    const delivered = await updateOrderTracking(ord.id, { status: "DELIVERED" }, "Partner");
    expect(delivered?.status).toBe("DELIVERED");
    expect(delivered?.paymentStatus).toBe("PAID");
    expect(delivered?.statusNote).toContain("delivered");

    // Blocks partner from editing a DELIVERED order, while Admin can still intervene
    await expect(updateOrderTracking(ord.id, { status: "CONFIRMED" }, "Partner")).rejects.toThrow(/already delivered/i);

    const adminOverride = await updateOrderTracking(
      ord.id,
      { status: "CANCELLED", note: "Admin cancelled after dispute" },
      "Admin",
      { isAdmin: true }
    );
    expect(adminOverride?.status).toBe("CANCELLED");
    expect(adminOverride?.statusNote).toBe("Admin cancelled after dispute");
  });

  it("round-trips full live tracking state through PostgreSQL trackingMetadata", () => {
    const order = makeOrder({
      id: "ETORD888002",
      orderNumber: "ETORD888002",
      status: "ASSIGNED_DRIVER",
      vehicleNumber: "TS 08 UB 1234",
      driverName: "Ramesh",
      driverPhone: "9848012345",
      statusNote: "Departed warehouse",
      paymentMethod: "UPI",
      paymentStatus: "PAID"
    });

    const mapped = mapDbOrderToRecord({
      id: order.id,
      parentCheckoutId: order.parentCheckoutId,
      customerId: order.customerId,
      storeId: order.storeId,
      addressId: "addr-1",
      status: "DISPATCHED",
      subtotalMinor: order.subtotalMinor,
      taxMinor: 0,
      discountMinor: 0,
      deliveryChargeMinor: order.deliveryChargeMinor,
      totalMinor: order.totalMinor,
      currency: "INR",
      trackingMetadata: buildTrackingMetadata(order),
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      items: [],
      reviews: []
    });

    expect(mapped.status).toBe("ASSIGNED_DRIVER");
    expect(mapped.vehicleNumber).toBe("TS 08 UB 1234");
    expect(mapped.driverName).toBe("Ramesh");
    expect(mapped.driverPhone).toBe("9848012345");
    expect(mapped.statusNote).toBe("Departed warehouse");
    expect(mapped.paymentMethod).toBe("UPI");
    expect(mapped.paymentStatus).toBe("PAID");
    expect(mapped.items).toHaveLength(1);
  });

  it("allows customer cancellation with reason before vehicle loading, notifies seller, and blocks cancellation once loading starts", async () => {
    vi.spyOn(prisma.order, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 } as never);
    vi.spyOn(prisma.store, "findUnique").mockResolvedValue({
      sellerProfile: { userId: "seller-user-1" }
    } as never);
    const notifCreateSpy = vi
      .spyOn(prisma.notification, "create")
      .mockResolvedValue({ id: "notif-1" } as never);
    vi.spyOn(prisma.adminNotification, "create").mockResolvedValue({ id: "anotif-1" } as never);

    // 1. Order in CONFIRMED state -> customer cancels with reason
    const cancellable = makeOrder({
      id: "ETORD999101",
      orderNumber: "ETORD999101",
      status: "CONFIRMED",
      customerId: "cust-1",
      customerEmail: "raju@example.com"
    });
    saveOrder(cancellable);

    // Must provide a reason >= 5 chars
    await expect(
      cancelCustomerOrder(cancellable.id, { id: "cust-1", email: "raju@example.com", roles: [Role.CUSTOMER] }, "no")
    ).rejects.toThrow(/cancellation reason/i);

    // Another customer cannot cancel
    await expect(
      cancelCustomerOrder(
        cancellable.id,
        { id: "cust-other", email: "other@example.com", roles: [Role.CUSTOMER] },
        "Ordered by mistake"
      )
    ).rejects.toThrow(/only cancel your own orders/i);

    // Owner cancels cleanly before loading
    const cancelled = await cancelCustomerOrder(
      cancellable.id,
      { id: "cust-1", email: "raju@example.com", roles: [Role.CUSTOMER] },
      "Construction schedule delayed by 1 week"
    );
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancellationReason).toBe("Construction schedule delayed by 1 week");
    expect(cancelled.cancelledBy).toBe("Customer");
    expect(notifCreateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "seller-user-1",
          title: expect.stringContaining("ETORD999101"),
          body: expect.stringContaining("Construction schedule delayed by 1 week")
        })
      })
    );

    // 2. Order already in LOADING_VEHICLE state -> customer CANNOT cancel
    const loadingOrder = makeOrder({
      id: "ETORD999102",
      orderNumber: "ETORD999102",
      status: "LOADING_VEHICLE",
      customerId: "cust-1",
      customerEmail: "raju@example.com"
    });
    saveOrder(loadingOrder);

    await expect(
      cancelCustomerOrder(
        loadingOrder.id,
        { id: "cust-1", email: "raju@example.com", roles: [Role.CUSTOMER] },
        "Changed my mind"
      )
    ).rejects.toThrow(/vehicle loading has already started/i);
  });
});
