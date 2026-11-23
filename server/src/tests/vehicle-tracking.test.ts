import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { prisma } from "../config/prisma.js";
import { createApp } from "../express-app.js";
import {
  saveOrder,
  updateOrderTracking,
  type OrderRecord
} from "../modules/orders/orders.routes.js";
import {
  endDriverTrip,
  generateTrackingLink,
  getDriverTripSession,
  getOrderTrackingSessionForViewer,
  saveDriverLocationSnapshot
} from "../modules/tracking/tracking.service.js";

function createTestOrder(id: string, overrides: Partial<OrderRecord> = {}): OrderRecord {
  const now = new Date().toISOString();
  return {
    id,
    orderNumber: id,
    parentCheckoutId: `chk-${id}`,
    customerId: "cust-track-1",
    customerName: "Srinivas Builders",
    customerPhone: "9848055443",
    customerEmail: "srinivas@example.com",
    storeId: "store-kkd-1",
    storeName: "Godavari Cement & Sand Depot",
    sellerId: "SELLER-9001",
    deliveryAddress: {
      contactName: "Srinivas Builders",
      mobile: "9848055443",
      line1: "Plot 12, Industrial Estate",
      city: "Kakinada",
      state: "Andhra Pradesh",
      postalCode: "533001",
      latitude: 17.0125,
      longitude: 82.2611
    },
    storeLocation: {
      lat: 16.9682,
      lng: 82.2289,
      address: "Depot Road, Kakinada"
    },
    status: "LOADING_VEHICLE",
    subtotalMinor: 250000,
    taxMinor: 0,
    discountMinor: 0,
    deliveryChargeMinor: 0,
    protectFeeMinor: 4900,
    totalMinor: 254900,
    currency: "INR",
    paymentMethod: "COD",
    paymentStatus: "PENDING",
    items: [
      {
        id: "it-1",
        productName: "River Sand (20 Ton Tipper Load)",
        unit: "load",
        quantity: 1,
        priceMinor: 250000,
        totalMinor: 250000
      }
    ],
    vehicleNumber: "AP 05 TX 4589",
    driverName: "Ramesh Naidu",
    driverPhone: "9848011223",
    statusHistory: [{ status: "LOADING_VEHICLE", timestamp: now, note: "Loading started" }],
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

describe("Delivery Vehicle Live Tracking (Zero-Cost Architecture)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("generates a secure hex token + WhatsApp URL, validates driver session, saves snapshots, and deactivates on DELIVERED (410 Gone)", async () => {
    vi.spyOn(prisma.order, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 } as never);
    vi.spyOn(prisma.deliveryTripSession, "updateMany").mockResolvedValue({ count: 0 } as never);
    vi.spyOn(prisma.deliveryTripSession, "create").mockResolvedValue({ id: "sess-1" } as never);
    vi.spyOn(prisma.deliveryTripSession, "findUnique").mockResolvedValue(null);
    vi.spyOn(prisma.deliveryTripSession, "findFirst").mockResolvedValue(null);

    const order = createTestOrder("ETORD610001");
    saveOrder(order);

    // 1. Generate tracking link
    const link = await generateTrackingLink(order, { clientOrigin: "https://etukas.com" });
    expect(link.token).toMatch(/^[a-f0-9]{48}$/);
    expect(link.trackingUrl).toBe(`https://etukas.com/driver/live?token=${link.token}`);
    expect(link.whatsappShareUrl).toContain("https://wa.me/919848011223?text=");
    expect(decodeURIComponent(link.whatsappShareUrl)).toContain("ETORD610001");
    expect(link.isActive).toBe(true);

    // 2. Validate driver session
    const driverSession = await getDriverTripSession(link.token);
    expect(driverSession.orderId).toBe("ETORD610001");
    expect(driverSession.isActive).toBe(true);
    expect(driverSession.storeLocation.lat).toBeCloseTo(16.9682, 4);
    expect(driverSession.customerLocation.lat).toBeCloseTo(17.0125, 4);
    expect(driverSession.lastKnownLocation).toBeNull();

    // 3. Save location snapshot fallback
    const pingTs = Date.now();
    const snap = await saveDriverLocationSnapshot({
      token: link.token,
      lat: 16.9855,
      lng: 82.2444,
      bearing: 42,
      speedKmh: 38.5,
      timestamp: pingTs
    });
    expect(snap.saved).toBe(true);
    expect(snap.lastKnownLocation.lat).toBe(16.9855);
    expect(snap.lastKnownLocation.bearing).toBe(42);

    // 4. Customer viewer endpoint returns persisted fallback coordinates
    const viewerSession = await getOrderTrackingSessionForViewer(order);
    expect(viewerSession.lastKnownLocation?.lat).toBe(16.9855);
    expect(viewerSession.lastKnownLocation?.lng).toBe(82.2444);
    expect(viewerSession.isActive).toBe(true);

    // 5. Mark order DELIVERED -> trip token must automatically deactivate
    await updateOrderTracking(order.id, { status: "DELIVERED" }, "Partner");

    // 6. Driver session & location snapshot must now return 410 Gone
    await expect(getDriverTripSession(link.token)).rejects.toMatchObject({
      status: 410
    });
    await expect(
      saveDriverLocationSnapshot({
        token: link.token,
        lat: 17.0125,
        lng: 82.2611,
        bearing: 0,
        speedKmh: 0
      })
    ).rejects.toMatchObject({
      status: 410
    });
  });

  it("exposes CSRF-exempt driver HTTP endpoints (/api/driver/session/:token & /api/driver/location-snapshot) returning 200 and 410 Gone after End Trip", async () => {
    vi.spyOn(prisma.order, "findFirst").mockResolvedValue(null);
    vi.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 } as never);
    vi.spyOn(prisma.deliveryTripSession, "updateMany").mockResolvedValue({ count: 0 } as never);
    vi.spyOn(prisma.deliveryTripSession, "create").mockResolvedValue({ id: "sess-2" } as never);
    vi.spyOn(prisma.deliveryTripSession, "findUnique").mockResolvedValue(null);

    const app = createApp();
    const order = createTestOrder("ETORD610002");
    saveOrder(order);

    const link = await generateTrackingLink(order, { clientOrigin: "http://localhost:5173" });

    // GET /api/driver/session/:token
    const getRes = await request(app).get(`/api/driver/session/${link.token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.ok).toBe(true);
    expect(getRes.body.data.orderId).toBe("ETORD610002");

    // POST /api/driver/location-snapshot (no cookies, no CSRF header — driver mobile web)
    const snapRes = await request(app)
      .post("/api/driver/location-snapshot")
      .send({
        token: link.token,
        lat: 16.9912,
        lng: 82.251,
        bearing: 120,
        speedKmh: 31
      });
    expect(snapRes.status).toBe(200);
    expect(snapRes.body.ok).toBe(true);
    expect(snapRes.body.data.saved).toBe(true);

    // End trip -> subsequent session check returns 410 Gone
    await endDriverTrip(link.token);
    const goneRes = await request(app).get(`/api/driver/session/${link.token}`);
    expect(goneRes.status).toBe(410);
    expect(goneRes.body.ok).toBe(false);
  });
});
